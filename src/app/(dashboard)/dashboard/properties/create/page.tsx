"use client";

import { useEffect, useMemo, useState } from "react";
import z from "zod";
import { toast } from "sonner";
import { useAppForm } from "@/shared/form/hooks";
import { FieldGroup } from "@/shared/ui/field";
import { SelectItem } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  listingTypeEnum,
  mediaTypeEnum,
  propertyLocationSourceEnum,
  propertyTypeEnum,
  propertyWorkflowStatusEnum,
} from "@/infrastructure/db/schema";
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

type TaxonomyItem = { id: string; slug: string; name: string; sortOrder: number };
type AttributeDefinition = {
  id: string;
  code: string;
  label: string;
  valueType: "number" | "string" | "boolean" | "enum" | "json";
  unit: string | null;
  isFilterable: boolean;
  scope: string;
  isRequired: boolean;
  options: Array<{ id: string; value: string; label: string }>;
};

type UploadInitResponsePayload = {
  fileId: string;
  bucket: string;
  storageKey: string;
  accessLevel: "public" | "private";
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
};

type UploadCompleteResponsePayload = {
  fileId: string;
  bucket: string;
  storageKey: string;
  accessLevel: "public" | "private";
  mimeType: string;
  bytes: number | null;
  checksum: string | null;
  publicUrl: string | null;
  uploadStatus: "pending" | "uploaded" | "failed" | "attached";
  completedAt: string | null;
};

function inferMediaType(mimeType: string): (typeof mediaTypeEnum.enumValues)[number] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

function createIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
}

export default function CreatePropertyPage() {
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomyItem[]>([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [categorySlug, setCategorySlug] = useState("");
  const [subcategorySlug, setSubcategorySlug] = useState("");
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [hoaFeeMinor, setHoaFeeMinor] = useState("");
  const [furnished, setFurnished] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedSummaries, setUploadedSummaries] = useState<
    UploadCompleteResponsePayload[]
  >([]);

  const uploadFiles = async (files: File[]) => {
    const uploaded: UploadCompleteResponsePayload[] = [];

    for (const file of files) {
      const mimeType = file.type || "application/octet-stream";
      const initRes = await fetch("/api/uploads/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createIdempotencyKey("upload-init"),
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType,
          bytes: file.size,
          accessLevel: "public",
        }),
      });

      const initJson = (await initRes.json()) as {
        success?: boolean;
        error?: string;
        data?: UploadInitResponsePayload;
      };
      if (!initRes.ok || !initJson.success || !initJson.data) {
        throw new Error(initJson.error ?? "Failed to initialize upload");
      }

      const putRes = await fetch(initJson.data.uploadUrl, {
        method: "PUT",
        headers: {
          ...initJson.data.requiredHeaders,
          "Content-Type": mimeType,
        },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error(`Upload failed for ${file.name}`);
      }

      const completeRes = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createIdempotencyKey("upload-complete"),
        },
        body: JSON.stringify({
          fileId: initJson.data.fileId,
          storageKey: initJson.data.storageKey,
        }),
      });

      const completeJson = (await completeRes.json()) as {
        success?: boolean;
        error?: string;
        data?: UploadCompleteResponsePayload;
      };
      if (!completeRes.ok || !completeJson.success || !completeJson.data) {
        throw new Error(completeJson.error ?? "Failed to finalize upload");
      }

      uploaded.push(completeJson.data);
    }

    return uploaded;
  };

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

      setIsUploading(true);
      let uploadedMedia: UploadCompleteResponsePayload[] = [];
      try {
        if (selectedFiles.length > 0) {
          uploadedMedia = await uploadFiles(selectedFiles);
          setUploadedSummaries(uploadedMedia);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to upload media");
        setIsUploading(false);
        return;
      }

      const payload = {
        ...parsed.data,
        l2Id: parsed.data.l2Id || undefined,
        categorySlug: categorySlug || undefined,
        subcategorySlug: subcategorySlug || undefined,
        attributes: Object.fromEntries(
          Object.entries(attributeValues)
            .filter(([, value]) => value !== "")
            .map(([code, value]) => {
              const definition = attributes.find((a) => a.code === code);
              if (!definition) return [code, value];
              if (definition.valueType === "number") return [code, Number(value)];
              if (definition.valueType === "boolean") return [code, value === "true"];
              if (definition.valueType === "json") {
                try {
                  return [code, JSON.parse(value)];
                } catch {
                  return [code, value];
                }
              }
              return [code, value];
            }),
        ),
        rentalTerms:
          parsed.data.listingType === "rent"
            ? {
                hoaFeeMinor: hoaFeeMinor ? Number(hoaFeeMinor) : undefined,
                furnished:
                  furnished === ""
                    ? undefined
                    : furnished === "true"
                      ? true
                      : false,
              }
            : undefined,
        uploadedMedia: uploadedMedia.map((item, index) => ({
          fileId: item.fileId,
          storageKey: item.storageKey,
          mediaType: inferMediaType(item.mimeType),
          sortOrder: index,
        })),
      };

      try {
        const res = await createProperty(payload);
        if (res.success) {
          form.reset();
          setAttributeValues({});
          setHoaFeeMinor("");
          setFurnished("");
          setSelectedFiles([]);
          setUploadedSummaries([]);
          toast.success("Property created");
        } else {
          const rootError =
            res.errors && "root" in res.errors ? res.errors.root?.[0] : undefined;
          toast.error(rootError ?? "Failed to create property");
        }
      } finally {
        setIsUploading(false);
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const res = await fetch("/api/taxonomy/categories");
      const json = await res.json();
      if (!cancelled && json.success) {
        setCategories(json.categories ?? []);
        const first = (json.categories ?? [])[0];
        if (first) setCategorySlug(first.slug);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!categorySlug) {
        setSubcategories([]);
        setSubcategorySlug("");
        return;
      }
      const res = await fetch(
        `/api/taxonomy/subcategories?category=${encodeURIComponent(categorySlug)}`,
      );
      const json = await res.json();
      if (!cancelled && json.success) {
        setSubcategories(json.subcategories ?? []);
        const first = (json.subcategories ?? [])[0];
        setSubcategorySlug(first?.slug ?? "");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!subcategorySlug) {
        setAttributes([]);
        setAttributeValues({});
        return;
      }
      const res = await fetch(
        `/api/taxonomy/attributes?subcategory=${encodeURIComponent(subcategorySlug)}`,
      );
      const json = await res.json();
      if (!cancelled && json.success) {
        setAttributes(json.attributes ?? []);
        setAttributeValues({});
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [subcategorySlug]);

  const attributeInputs = useMemo(
    () =>
      attributes.map((attribute) => {
        const value = attributeValues[attribute.code] ?? "";
        const setValue = (next: string) =>
          setAttributeValues((prev) => ({ ...prev, [attribute.code]: next }));
        return (
          <div key={attribute.id} className="space-y-2">
            <Label htmlFor={`attr-${attribute.code}`}>
              {attribute.label}
              {attribute.unit ? ` (${attribute.unit})` : ""}
            </Label>
            {attribute.valueType === "enum" ? (
              <select
                id={`attr-${attribute.code}`}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              >
                <option value="">Select...</option>
                {attribute.options.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : attribute.valueType === "boolean" ? (
              <select
                id={`attr-${attribute.code}`}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              >
                <option value="">Select...</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <Input
                id={`attr-${attribute.code}`}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                type={attribute.valueType === "number" ? "number" : "text"}
              />
            )}
          </div>
        );
      }),
    [attributes, attributeValues],
  );

  return (
    <div className="container px-4 mx-auto my-6">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
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

          <div className="space-y-2">
            <Label htmlFor="categorySlug">Category</Label>
            <select
              id="categorySlug"
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              value={categorySlug}
              onChange={(event) => setCategorySlug(event.target.value)}
            >
              <option value="">Select category...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategorySlug">Subcategory</Label>
            <select
              id="subcategorySlug"
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              value={subcategorySlug}
              onChange={(event) => setSubcategorySlug(event.target.value)}
            >
              <option value="">Select subcategory...</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.slug}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>

          {attributeInputs}

          <div className="space-y-2">
            <Label htmlFor="hoaFeeMinor">HOA Fee (minor units, rental only)</Label>
            <Input
              id="hoaFeeMinor"
              type="number"
              value={hoaFeeMinor}
              onChange={(event) => setHoaFeeMinor(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="furnished">Furnished (rental only)</Label>
            <select
              id="furnished"
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              value={furnished}
              onChange={(event) => setFurnished(event.target.value)}
            >
              <option value="">Select...</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-media">Property Media (direct upload to R2)</Label>
            <Input
              id="property-media"
              type="file"
              multiple
              accept="image/*,video/mp4,application/pdf"
              onChange={(event) => {
                setSelectedFiles(Array.from(event.target.files ?? []));
              }}
            />
            {selectedFiles.length > 0 ? (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedFiles.map((file) => file.name).join(", ")}
              </div>
            ) : null}
            {uploadedSummaries.length > 0 ? (
              <div className="text-sm text-muted-foreground">
                Uploaded: {uploadedSummaries.map((file) => file.storageKey).join(", ")}
              </div>
            ) : null}
          </div>

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

        <Button className="mt-4" disabled={isUploading} type="submit">
          {isUploading ? "Uploading media..." : "Create Property"}
        </Button>
      </form>
    </div>
  );
}
