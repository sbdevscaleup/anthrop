# Property Taxonomy Transition Context

Last updated: 2026-03-01

## Objective
Move from enum-coupled property type + generic JSON to expansion-safe taxonomy and typed attributes without breaking existing flows.

## Current Implementation State
- Additive schema migration is applied (0007).
- Create flow performs dual-write behavior:
  - still writes legacy fields
  - writes taxonomy IDs and attribute/rental tables when provided
- Search supports dual-read style:
  - existing filters still work
  - new taxonomy and typed attribute filters are accepted

## Legacy Fields (Do Not Remove Yet)
- property.property_type
- property.area_m2
- property.bedrooms
- property.bathrooms
- property.floors
- property.year_built
- property.features_json (overflow-only)

## New Canonical Modeling
- Taxonomy: property_category + property_subcategory
- Attribute definitions/options: property_attribute_definition + property_attribute_option
- Value storage: property_attribute_value (typed columns)
- Rental extension: property_rental_terms
- Property linkage: property.category_id + property.subcategory_id

## Overflow-Only Definition
features_json should only hold:
- low-priority metadata
- temporary or experimental attributes
- non-critical display extras

features_json should NOT be used for:
- core filters
- primary business rules
- required validation logic
- stable analytics dimensions

## Cutover Conditions (Before Legacy Removal)
1. 100% create/update write coverage into taxonomy model.
2. Search and list pages fully read taxonomy-first fields.
3. No production consumers depending on property_type-only semantics.
4. Monitoring window passes without regression.
5. Backfill and parity checks completed.

## Near-Term Next Steps
1. Add attribute requiredness validation by subcategory in service layer.
2. Strengthen type-safe contracts for `attributes` payload per subcategory.
3. Add query-plan verification for high-value filters.
4. Update schema docs to reflect current `src/infrastructure/db/schema/*` layout.
