import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function PropertiesPage() {
  return (
    <>
      <div className="space-y-6">My Properties Page</div>
      <div>
        <Button asChild>
          <Link href="/dashboard/properties/create">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Link>
        </Button>
      </div>
    </>
  );
}
