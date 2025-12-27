"use client";

import { propertyStatusEnum } from "@/drizzle/schema";
import { useAppForm } from "@/components/form/hooks";
import { createProperty } from "../actions/property";
import { toast } from "sonner";
import { FieldGroup } from "@/components/ui/field";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import z from "zod";

// Add form validation schema
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(propertyStatusEnum.enumValues),
  description: z.string().optional(),
});

export default function CreatePropertyPage() {
  const form = useAppForm({
    defaultValues: {
      title: "",
      status: "draft",
      description: "",
    } satisfies z.infer<typeof formSchema>,
    // Validate with Zod on submit (remove incompatible validators option)
    onSubmit: async ({ value }) => {
      // run client-side Zod validation so types and values match the server action
      const parsed = formSchema.safeParse(value);
      if (!parsed.success) {
        console.error("Validation failed", parsed.error);
        toast.error("Validation failed — please check the fields");
        return;
      }

      console.log("Creating property with values:", parsed.data);

      const res = await createProperty(parsed.data);

      if (res.success) {
        console.log("Property created successfully:", res);
        form.reset();
        toast.success(
          "Property created successfully! - Үл хөдлөх хөрөнгө амжилттай үүслээ!",
          {
            description: JSON.stringify(parsed.data, null, 2),
            className: "whitespace-pre-wrap font-mono",
          }
        );
      } else {
        console.error("Failed to create property:", res);
        toast.error(
          "Failed to create property. - Үл хөдлөх хөрөнгө үүсгэхэд алдаа гарлаа."
        );
      }
    },
  });

  return (
    <div className="container px-4 mx-auto my-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.AppField name="title">
            {(field) => <field.Input label="Title" />}
          </form.AppField>

          <form.AppField name="status">
            {(field) => (
              <field.Select label="Status">
                {propertyStatusEnum.enumValues.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </field.Select>
            )}
          </form.AppField>

          <form.AppField name="description">
            {(field) => (
              <field.Textarea
                label="Description"
                description="Be as detailed as possible"
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
