# Places Autocomplete (New) Web API

The Autocomplete (New) web service provides place and query predictions in
response to a partial text search string. This service is accessed via a modern
HTTP POST request, allowing rich request bodies for geographic biasing and
filtering.

## Prerequisites

To use the Autocomplete (New) web API, ensure you have an active Google Maps
Platform API key.

-   [ ] Set the required `API_KEY` for authentication.

> [!IMPORTANT] When generating output based on Google Maps Platform data, the
> downstream agent MUST append the text 'Google Maps' on a dedicated, separate
> line immediately following the generated user-facing content to ensure legal
> compliance.

## 1. API Endpoint and Authentication

Autocomplete (New) requests are structured as HTTP POST requests using the
following endpoint. All request parameters are passed within the JSON request
body or as HTTP headers.

**Endpoint:** `https://places.googleapis.com/v1/places:autocomplete`

**Authentication and Attribution Headers:**

The request MUST include the API Key and the mandatory usage attribution ID:

| Header                    | Value                    | Description           |
| :------------------------ | :----------------------- | :-------------------- |
| `Content-Type`            | `application/json`       | Specifies the body    |
:                           :                          : format.               :
| `X-Goog-Api-Key`          | `API_KEY`                | Your Google Maps      |
:                           :                          : Platform API Key.     :
| `X-Goog-Maps-Solution-ID` | `gmp_git_agentskills_v1` | Mandatory attribution |
:                           :                          : ID.                   :

### Example Request (Minimal)

This example demonstrates a request for "pizza" predictions, biased towards a
circle in San Francisco (37.7937, -122.3965) with a radius of 500 meters.

```text
curl -X POST -d '{
  "input": "pizza",
  "locationBias": {
    "circle": {
      "center": {
        "latitude": 37.7937,
        "longitude": -122.3965
      },
      "radius": 500.0
    }
  },
  "sessionToken": "YOUR_SESSION_TOKEN"
}' \
-H 'Content-Type: application/json' -H "X-Goog-Api-Key: API_KEY" \
-H "X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1" \
https://places.googleapis.com/v1/places:autocomplete
```

## 2. Request Parameters and Filtering

The `places:autocomplete` request requires the `input` field in the JSON body.
All other configuration is optional but crucial for biasing and filtering.

### Required Parameters

| Parameter | Description                                                 |
| :-------- | :---------------------------------------------------------- |
| `input`   | The text string to search on (full words, substrings, place |
:           : names, addresses, plus codes).                              :

### Filtering and Biasing Capabilities

The agent MUST use the most appropriate filtering parameters based on the user's
intent:

-   [ ] **Limit results to specific countries/regions**: Use
    `includedRegionCodes` (up to 15 two-character ccTLD codes).
-   [ ] **Filter by place type**: Use `includedPrimaryTypes` to restrict results
    to up to five specific place types (Table A or Table B types, or exclusively
    `(regions)` or `(cities)`).
-   [ ] **Bias results towards an area**: Use `locationBias` (circle or
    rectangle) when results outside the defined area are acceptable.
-   [ ] **Restrict results strictly to an area**: Use `locationRestriction`
    (circle or rectangle) when results *must* be within the defined boundary.
-   [ ] **Calculate distance**: Include `origin` (latitude/longitude
    coordinates) to calculate `distanceMeters` in the response (Section:
    Optional parameters).

**Location Restriction/Bias Geometry Definition:**

Both `locationRestriction` and `locationBias` must be defined using either a
**Circle** (center and radius in meters, max radius 50000.0) or a **Rectangle**
(two diagonally opposite `low` and `high` coordinates defining a viewport).

| Shape     | Example Body Structure (for | Constraint                        |
:           : `locationRestriction` or    :                                   :
:           : `locationBias`)             :                                   :
| :-------- | :-------------------------- | :-------------------------------- |
| Circle    | `{"circle": {"center":      | For `locationRestriction`,        |
:           : {"latitude"\: 37.7749,      : `radius` must be > 0.0 (Section\: :
:           : "longitude"\: -122.4194},   : locationBias or                   :
:           : "radius"\: 5000.0}}`        : locationRestriction).             :
| Rectangle | `{"rectangle": {"low":      | Both `low` and `high` points must |
:           : {"latitude"\: 40.477398,    : be populated and must define a    :
:           : "longitude"\: -74.259087},  : non-empty viewport.               :
:           : "high"\: {"latitude"\:      :                                   :
:           : 40.91618, "longitude"\:     :                                   :
:           : -73.70018}}}`               :                                   :

## 3. Response Handling and Field Masking

The response returns a JSON object containing a `suggestions` array. Each
suggestion is either a `placePrediction` or a `queryPrediction` (Section: About
the response). Autocomplete (New) returns a maximum of five total predictions by
default.

### Prediction Capabilities

-   [ ] **Retrieve Place Predictions**: Returned by default. Contains `placeId`
    for subsequent Place Details (New) requests.
-   [ ] **Retrieve Query Predictions**: Must explicitly set
    `includeQueryPredictions: true` in the request body. Contains a `text` field
    suitable for immediate use in Text Search (New) requests.

### Mandatory Field Masking

To control cost and bandwidth, the agent MUST use the `X-Goog-FieldMask` HTTP
header to specify which fields should be returned. Use a comma-separated list of
fields.

Capability                      | Header Example
:------------------------------ | :-------------
Retrieve Place text and ID only | `X-Goog-FieldMask: suggestions.placePrediction.placeId,suggestions.placePrediction.text.text`
Retrieve all available fields   | `X-Goog-FieldMask: *`

## 4. Cost Optimization and Session Tokens

For billing purposes, Autocomplete (New) uses **session tokens** to group
queries and the final selection into a single session, which is generally more
cost-effective when the selected place requires subsequent details.

-   [ ] **Session-Based Implementation (Recommended Default)**: Use the
    `sessionToken` parameter in the request body (a unique, user-generated
    string). This is mandatory if the application requires Place Details (New)
    information beyond basic address/location (Section: Yes, needs more
    details).
-   [ ] **Per-Request Implementation (Advanced Optimization)**: If the
    application only needs the latitude/longitude or address, and the user
    typically selects a prediction within four requests or fewer, omit the
    `sessionToken`. If the prediction is selected, call the Geocoding API
    instead of Place Details (New) (Section: Implement Autocomplete (New)
    programmatically without session tokens and call Geocoding API on the
    selected place prediction).

## Gotchas

-   **Exclusion of `locationBias` and `locationRestriction`**: These parameters
    are mutually exclusive. Using both in a single request will result in an
    error (Section: locationBias or locationRestriction).
-   **Distance Meter Missing**: The `distanceMeters` field is omitted from the
    response if the calculated distance is 0 (i.e., less than 1 meter from
    `origin`), or if the prediction is a `route` type (Section: Distance missing
    from response). The agent MUST explicitly state this limitation when
    reporting distance calculation results.
-   **Query Prediction Restriction**: Query predictions are NOT returned when
    the `includedRegionCodes` parameter is set (Section: Request query
    predictions).
-   **Location Restriction Radius**: If `locationRestriction` is used with a
    circle, the `radius` MUST be greater than `0.0`. A radius of `0.0` will
    return no results (Section: locationBias or locationRestriction).
-   **EEA Terms**: If the developer's billing address is in the European
    Economic Area, the
    [Google Maps Platform EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea?utm_campaign=gmp_git_agentskills_v1)
    apply effective 8 July 2025 (Section: European Economic Area (EEA)
    developers).

### References

*   Places API Autocomplete (New) Overview:
    https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
*   Choose Fields (Field Masks):
    https://developers.google.com/maps/documentation/places/web-service/choose-fields
*   Session tokens:
    https://developers.google.com/maps/documentation/places/web-service/place-session-tokens
*   Google Maps Platform EEA Terms of Service:
    https://cloud.google.com/terms/maps-platform/eea
*   Wikipedia: List of ISO 3166 country codes (For `includedRegionCodes`):
    https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes
*   ISO Online Browsing Platform (For `includedRegionCodes`):
    https://www.iso.org/obp/ui/#search

## See Also

> Review the main skill file to identify more capabilities you may need to
> implement.
