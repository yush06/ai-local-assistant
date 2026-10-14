import {
  Router,
} from "express";

import {
  PlacesService,
} from "../services/places/places.service";

import {
  AssistantService,
} from "../services/assistant/assistant.service";

import {
  LocationService,
} from "../services/location/location.service";

import type {
  AssistantQuery,
} from "../services/assistant/assistant.types";

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

const locationService =
  new LocationService(
    apiKey,
  );

const assistantService =
  new AssistantService(
    placesService,
    locationService,
  );

router.post(
  "/query",
  async (
    req,
    res,
  ) => {
    try {
      const query =
        req.body as AssistantQuery;

      if (!query) {
        return res
          .status(400)
          .json({
            error:
              "Request body is required",
          });
      }

      /*
       * Category
       */
      if (
        query.category !==
        "restaurant"
      ) {
        return res
          .status(400)
          .json({
            error:
              "Currently only restaurant category is supported",
          });
      }

      /*
       * Location
       */
      if (
        !query.location ||
        typeof query.location !==
          "string"
      ) {
        return res
          .status(400)
          .json({
            error:
              "location is required",
          });
      }

      /*
       * Budget
       */
      if (
        query.budget !==
          undefined &&
        (
          typeof query.budget !==
            "number" ||
          query.budget <= 0
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "budget must be a positive number",
          });
      }

      /*
       * Number of people
       */
      if (
        query.people !==
          undefined &&
        (
          typeof query.people !==
            "number" ||
          query.people <= 0
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "people must be a positive number",
          });
      }

      /*
       * Radius
       */
      if (
        query.radiusKm !==
          undefined &&
        (
          typeof query.radiusKm !==
            "number" ||
          query.radiusKm <= 0 ||
          query.radiusKm > 50
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "radiusKm must be between 0 and 50",
          });
      }

      /*
       * Limit
       */
      if (
        query.limit !==
          undefined &&
        (
          typeof query.limit !==
            "number" ||
          query.limit <= 0
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "limit must be a positive number",
          });
      }

      /*
       * Execute query.
       */
      const result =
        await assistantService
          .search(query);

      return res.json(
        result,
      );
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
            "Unable to process assistant query",

          message:
            error instanceof Error
              ? error.message
              : "Unknown error",
        });
    }
  },
);

export default router;