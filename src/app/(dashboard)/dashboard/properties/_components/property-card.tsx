"use client"

import { useState } from "react"
import { Card, CardContent } from "@/shared/ui/card"
import { Heart, Share2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Badge } from "@/shared/ui/badge"
import {
  Bed,
  Bath,
  Maximize,
  MoreVertical,
  MapPin,
  Calendar,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Property {
  id: number
  title: string
  type: string
  price: number
  location: string
  bedrooms: number
  bathrooms: number
  area: number
  status: string
  images: string[]
  description: string
  yearBuilt: number
  features: string[]
}

interface PropertyCardProps {
  property: Property
  isFavorite?: boolean
  onToggleFavorite?: (id: number) => void
  onShare?: (id: number) => void
  onDelete: (id: number) => void
  onUpdateStatus: (id: number, status: string) => void
  isHighlighted?: boolean
}

export function PropertyCard({
  property,
  isFavorite = false,
  onToggleFavorite,
  onShare,
  onDelete,
  onUpdateStatus,
  isHighlighted = false,
}: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndex(
      (prev) => (prev - 1 + property.images.length) % property.images.length,
    )
  }

  const goToImage = (index: number) => {
    setCurrentImageIndex(index)
  }

  const formatPrice = (price: number) => {
    if (property.type === "For Rent") {
      return `$${price.toLocaleString()}/mo`
    }
    return `$${price.toLocaleString()}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-primary/20 text-primary border-primary/30"
      case "Pending":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30"
      case "Sold":
        return "bg-muted text-muted-foreground border-border"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <div
      className={cn(
        "group rounded-lg overflow-hidden bg-card transition-shadow",
        isHighlighted && "ring-2 ring-accent",
      )}
    >
      <div className="relative">
        <img
          src={property.images[currentImageIndex] || "/placeholder.svg"}
          alt={property.title}
          className="w-full h-64 object-cover transition-transform group-hover:scale-105"
        />

        {property.images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-3 right-3 backdrop-blur-2xl text-xs rounded">
          {currentImageIndex + 1} / {property.images.length}
        </div>

        {/* Dots Indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          {property.images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                goToImage(index)
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentImageIndex
                  ? "bg-background"
                  : "bg-background/50",
              )}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>

        {/* <div className="absolute top-3 right-3 flex gap-2"> */}
        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge
            variant="outline"
            className={`${getStatusColor(property.status)} backdrop-blur-sm`}
          >
            {property.status}
          </Badge>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onShare?.(property.id)
            }}
            className="w-8 h-8 rounded-full bg-background/90 flex items-center justify-center hover:bg-background transition-colors"
            aria-label="Share property"
          >
            <Share2 className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite?.(property.id)
            }}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              isFavorite ? "bg-accent" : "bg-background/90 hover:bg-background",
            )}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Heart
              className={cn(
                "w-4 h-4",
                isFavorite
                  ? "text-accent-foreground fill-accent-foreground"
                  : "text-foreground",
              )}
            />
          </button>
        </div>

        {/* </div> */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="backdrop-blur-sm">
            {property.type}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg text-balance flex-1 min-w-0">
            {property.title}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateStatus(property.id, "Active")}
              >
                Mark as Active
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateStatus(property.id, "Pending")}
              >
                Mark as Pending
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateStatus(property.id, "Sold")}
              >
                Mark as Sold
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(property.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4" />
          {property.location}
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {property.description}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            {property.bedrooms}
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            {property.bathrooms}
          </div>
          <div className="flex items-center gap-1">
            <Maximize className="h-4 w-4" />
            {property.area} sqft
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-2xl font-bold text-primary">
            {formatPrice(property.price)}
          </p>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </div>
      </CardContent>
    </div>
  )
}