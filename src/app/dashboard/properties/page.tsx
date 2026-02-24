"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { PropertyCard } from "./_components/property-card"
import { PropertyFilters } from "./_components/property-filters"
import { toast } from "sonner"

const mockProperties = [
  {
    id: 1,
    title: "Modern Downtown Apartment",
    type: "For Sale",
    price: 450000,
    location: "Downtown, NY",
    bedrooms: 2,
    bathrooms: 2,
    area: 1200,
    status: "Active",
    images: [
      "/mock-properties/re-image1.jpg",
      "/mock-properties/re-image2.jpg",
      "/mock-properties/re-image3.jpg",
    ],
    description: "Beautiful modern apartment with city views",
    yearBuilt: 2020,
    features: ["Parking", "Gym", "Pool"],
  },
  {
    id: 2,
    title: "Luxury Villa with Pool",
    type: "For Sale",
    price: 1200000,
    location: "Beverly Hills, CA",
    bedrooms: 5,
    bathrooms: 4,
    area: 4500,
    status: "Active",
    images: [
      "/mock-properties/re-image4.jpg",
      "/mock-properties/re-image2.jpg",
      "/mock-properties/re-image3.jpg",
      "/mock-properties/re-image1.jpg",
      "/mock-properties/re-image7.jpg",
    ],
    description: "Stunning luxury villa with private pool and garden",
    yearBuilt: 2019,
    features: ["Pool", "Garden", "Garage", "Security"],
  },
  {
    id: 3,
    title: "Cozy Studio Apartment",
    type: "For Rent",
    price: 1800,
    location: "Brooklyn, NY",
    bedrooms: 1,
    bathrooms: 1,
    area: 600,
    status: "Active",
    images: [
      "/mock-properties/re-image3.jpg",
      "/mock-properties/re-image2.jpg",
      "/mock-properties/re-image1.jpg",
      "/mock-properties/re-image4.jpg",
    ],
    description: "Perfect studio for young professionals",
    yearBuilt: 2018,
    features: ["Furnished", "Utilities Included"],
  },
  {
    id: 4,
    title: "Family House with Garden",
    type: "For Rent",
    price: 3500,
    location: "Austin, TX",
    bedrooms: 4,
    bathrooms: 3,
    area: 2800,
    status: "Pending",
    images: [
      "/mock-properties/re-image2.jpg",
      "/mock-properties/re-image3.jpg",
      "/mock-properties/re-image4.jpg",
      "/mock-properties/re-image1.jpg",
    ],
    description: "Spacious family home with large backyard",
    yearBuilt: 2015,
    features: ["Garden", "Garage", "Pet Friendly"],
  },
  {
    id: 5,
    title: "Penthouse Suite",
    type: "For Sale",
    price: 2500000,
    location: "Manhattan, NY",
    bedrooms: 3,
    bathrooms: 3,
    area: 3200,
    status: "Active",
    images: [
      "/mock-properties/re-image5.jpg",
      "/mock-properties/re-image6.jpg",
      "/mock-properties/re-image7.jpg",
      "/mock-properties/re-image8.jpg",
    ],
    description: "Exclusive penthouse with panoramic views",
    yearBuilt: 2021,
    features: ["Concierge", "Rooftop", "Smart Home"],
  },
  {
    id: 6,
    title: "Beach House",
    type: "For Sale",
    price: 850000,
    location: "Miami, FL",
    bedrooms: 3,
    bathrooms: 2,
    area: 2200,
    status: "Sold",
    images: [
      "/mock-properties/re-image7.jpg",
      "/mock-properties/re-image8.jpg",
      "/mock-properties/re-image6.jpg",
      "/mock-properties/re-image5.jpg",
    ],
    description: "Beautiful beach house with ocean views",
    yearBuilt: 2017,
    features: ["Beach Access", "Deck", "Ocean View"],
  },
]

export default function PropertiesPage() {
  const [properties, setProperties] = useState(mockProperties)
  const [favorites, setFavorites] = useState<Set<number>>(new Set([3]))
  const [filteredProperties, setFilteredProperties] = useState(mockProperties)

  const handleToggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast("Removed from favorites", {
          description: "Property has been removed from your saved list.",
        })
      } else {
        next.add(id)
        toast("Added to favorites", {
          description: "Property has been saved to your favorites.",
        })
      }
      return next
    })
  }

  const handleShare = (id: number) => {
    const property = mockProperties.find((p) => p.id === id)
    if (property) {
      navigator.clipboard?.writeText(
        `Check out this property: ${property.location}`,
      )
      toast("Link copied", {
        description: "Property link has been copied to clipboard.",
      })
    }
  }

  const handleFilterChange = (filters: {
    search: string
    type: string
    status: string
    priceRange: [number, number]
  }) => {
    let filtered = [...properties]

    if (filters.search) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          p.location.toLowerCase().includes(filters.search.toLowerCase()) ||
          p.description.toLowerCase().includes(filters.search.toLowerCase()),
      )
    }

    if (filters.type !== "all") {
      filtered = filtered.filter((p) => p.type === filters.type)
    }

    if (filters.status !== "all") {
      filtered = filtered.filter((p) => p.status === filters.status)
    }

    filtered = filtered.filter(
      (p) =>
        p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1],
    )

    setFilteredProperties(filtered)
  }

  // const handleAddProperty = (property: any) => {
  //   const newProperty = {
  //     ...property,
  //     id: properties.length + 1,
  //     status: "Active",
  //   }
  //   setProperties([newProperty, ...properties])
  //   setFilteredProperties([newProperty, ...filteredProperties])
  // }

  const handleDeleteProperty = (id: number) => {
    setProperties(properties.filter((p) => p.id !== id))
    setFilteredProperties(filteredProperties.filter((p) => p.id !== id))
  }

  const handleUpdateStatus = (id: number, status: string) => {
    const updateProps = (props: typeof properties) =>
      props.map((p) => (p.id === id ? { ...p, status } : p))
    setProperties(updateProps(properties))
    setFilteredProperties(updateProps(filteredProperties))
  }

  return (
    <>
      <div className="flex flex-col px-2 py-4 gap-4">
        <h1 className="font-bold text-4xl">My Properties Page</h1>
        <div>
          <Button asChild>
            <Link href="/dashboard/properties/create">
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Link>
          </Button>
        </div>
        <PropertyFilters onFilterChange={handleFilterChange} />
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredProperties.length} of {properties.length}{" "}
              properties
            </p>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No properties found matching your filters
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onToggleFavorite={handleToggleFavorite}
                  onShare={handleShare}
                  onDelete={handleDeleteProperty}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
