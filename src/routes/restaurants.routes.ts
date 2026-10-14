import {
  Router,
} from "express";

import {
  PlacesService,
} from "../services/places/places.service";

import {
  rankRestaurants,
} from "../services/ranking/ranking.service";


const router =
  Router();


const apiKey =
  process.env.GOOGLE_MAPS_API_KEY;


if (!apiKey) {
  throw new Error(
    "GOOGLE_MAPS_API_KEY is not configured",
  );
}


const placesService =
  new PlacesService(
    apiKey,
  );


router.get(
  "/",
  async (
    req,
    res,
  ) => {
    try {
      /*
       * ------------------------------------
       * CITY
       * ------------------------------------
       */

      const city =
        typeof req.query.city ===
          "string"
          ? req.query.city.trim()
          : "Kanpur";


      /*
       * ------------------------------------
       * LIMIT
       * ------------------------------------
       */

      const parsedLimit =
        Number(
          req.query.limit ??
            10,
        );

      const limit =
        Number.isFinite(
          parsedLimit,
        )
          ? Math.min(
              Math.max(
                parsedLimit,
                1,
              ),
              20,
            )
          : 10;


      /*
       * ------------------------------------
       * BUDGET
       * ------------------------------------
       */

      const parsedBudget =
        typeof req.query.budget ===
          "string"
          ? Number(
              req.query.budget,
            )
          : undefined;

      const budget =
        parsedBudget !==
          undefined &&
        Number.isFinite(
          parsedBudget,
        )
          ? parsedBudget
          : undefined;


      /*
       * ------------------------------------
       * VALIDATE CITY
       * ------------------------------------
       */

      if (!city) {
        return res
          .status(400)
          .json({
            error:
              "city is required",
          });
      }


      /*
       * ------------------------------------
       * CANDIDATES
       * ------------------------------------
       */

      const candidateLimit =
        Math.min(
          Math.max(
            limit * 2,
            10,
          ),
          20,
        );


      /*
       * ------------------------------------
       * GOOGLE PLACES
       * ------------------------------------
       */

      const restaurants =
        await placesService
          .searchRestaurants(
            city,
            candidateLimit,
          );


      /*
       * ------------------------------------
       * ADAPT TO GENERIC RANKING MODEL
       * ------------------------------------
       */

      const rankableRestaurants =
        restaurants.map(
          (
            restaurant,
          ) => ({
            ...restaurant,

            category:
              "restaurant" as const,
          }),
        );


      /*
       * ------------------------------------
       * RANK RESTAURANTS
       * ------------------------------------
       *
       * "best" preserves the normal
       * recommendation behavior for this
       * existing endpoint.
       */

      const rankedRestaurants =
        rankRestaurants(
          rankableRestaurants,
          {
            budget,

            sort:
              "best",
          },
        );


      /*
       * ------------------------------------
       * FINAL RESULTS
       * ------------------------------------
       */

      const results =
        rankedRestaurants.slice(
          0,
          limit,
        );


      /*
       * ------------------------------------
       * RESPONSE
       * ------------------------------------
       */

      return res.json({
        query:
          `restaurants in ${city}`,

        ranking: {
          method:
            "weighted-score",

          weights: {
            rating: 40,

            reviews: 30,

            price: 20,

            dataQuality: 10,
          },

          budget,
        },

        count:
          results.length,

        results,
      });
    } catch (
      error
    ) {
      console.error(
        error,
      );

      return res
        .status(502)
        .json({
          error:
            "Unable to fetch restaurants",

          message:
            error instanceof Error
              ? error.message
              : "Unknown error",
        });
    }
  },
);


export default router;