"use client";

import z from "zod";
import { toast } from "sonner";
import { useAppForm } from "@/components/form/hooks";
import { FieldGroup } from "@/components/ui/field";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  listingTypeEnum,
  propertyLocationSourceEnum,
  propertyTypeEnum,
  propertyWorkflowStatusEnum,
} from "@/drizzle/schema";
import { createProperty } from "../actions/property";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  propertyType: z.enum(propertyTypeEnum.enumValues),
  listingType: z.enum(listingTypeEnum.enumValues),
  workflowStatus: z.enum(propertyWorkflowStatusEnum.enumValues),
  locationSource: z.enum(propertyLocationSourceEnum.enumValues),
  l2Id: z.string().uuid().optional(),
  currencyCode: z.string().length(3),
});

export default function CreatePropertyPage() {
  const form = useAppForm({
    defaultValues: {
      title: "",
      description: "",
      propertyType: propertyTypeEnum.enumValues[0],
      listingType: listingTypeEnum.enumValues[0],
      workflowStatus: "draft",
      locationSource: "manual",
      l2Id: "",
      currencyCode: "MNT",
    } satisfies z.infer<typeof formSchema>,
    onSubmit: async ({ value }) => {
      const parsed = formSchema.safeParse(value);
      if (!parsed.success) {
        toast.error("Validation failed. Please check the form fields.");
        return;
      }

      const payload = {
        ...parsed.data,
        l2Id: parsed.data.l2Id || undefined,
      };

      const res = await createProperty(payload);
      if (res.success) {
        form.reset();
        toast.success("Property created");
      } else {
        const rootError =
          res.errors && "root" in res.errors ? res.errors.root?.[0] : undefined;
        toast.error(rootError ?? "Failed to create property");
      }
    },
  });

  return (
    <div className="container px-4 mx-auto my-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.AppField name="title">
            {(field) => <field.Input label="Title" />}
          </form.AppField>

          <form.AppField name="description">
            {(field) => (
              <field.Textarea
                label="Description"
                description="Optional listing description"
              />
            )}
          </form.AppField>

          <form.AppField name="propertyType">
            {(field) => (
              <field.Select label="Property Type">
                {propertyTypeEnum.enumValues.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </field.Select>
            )}
          </form.AppField>

          <form.AppField name="listingType">
            {(field) => (
              <field.Select label="Listing Type">
                {listingTypeEnum.enumValues.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </field.Select>
            )}
          </form.AppField>

          <form.AppField name="workflowStatus">
            {(field) => (
              <field.Select label="Workflow Status">
                {propertyWorkflowStatusEnum.enumValues.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </field.Select>
            )}
          </form.AppField>

          <form.AppField name="locationSource">
            {(field) => (
              <field.Select label="Location Source">
                {propertyLocationSourceEnum.enumValues.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </field.Select>
            )}
          </form.AppField>

          <form.AppField name="l2Id">
            {(field) => (
              <field.Input
                label="District/Soum (l2Id)"
                description="Required in manual mode. UUID from admin_l2."
              />
            )}
          </form.AppField>

          <form.AppField name="currencyCode">
            {(field) => (
              <field.Input
                label="Currency Code"
                description="ISO currency code (e.g. MNT)"
              />
            )}
          </form.AppField>
        </FieldGroup>

        <Button className="mt-4" type="submit">
          Create Property
        </Button>
      </form>
    </div>
  );
}
