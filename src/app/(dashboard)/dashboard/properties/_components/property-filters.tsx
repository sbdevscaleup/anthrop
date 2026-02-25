"use client"

import { useState } from "react"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { Search, SlidersHorizontal } from "lucide-react"
import { Card, CardContent } from "@/shared/ui/card"

interface PropertyFiltersProps {
  onFilterChange: (filters: {
    search: string
    type: string
    status: string
    priceRange: [number, number]
  }) => void
}

export function PropertyFilters({ onFilterChange }: PropertyFiltersProps) {
  const [search, setSearch] = useState("")
  const [type, setType] = useState("all")
  const [status, setStatus] = useState("all")
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onFilterChange({
      search: value,
      type,
      status,
      priceRange: [0, 10000000],
    })
  }

  const handleTypeChange = (value: string) => {
    setType(value)
    onFilterChange({
      search,
      type: value,
      status,
      priceRange: [0, 10000000],
    })
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    onFilterChange({
      search,
      type,
      status: value,
      priceRange: [0, 10000000],
    })
  }

  const handleReset = () => {
    setSearch("")
    setType("all")
    setStatus("all")
    onFilterChange({
      search: "",
      type: "all",
      status: "all",
      priceRange: [0, 10000000],
    })
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or location..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-180px">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="For Sale">For Sale</SelectItem>
                <SelectItem value="For Rent">For Rent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-180px">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Sold">Sold</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              Reset
            </Button>
          </div>

          {showAdvanced && (
            <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Bedrooms
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Bathrooms
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Price Range
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="0-500000">$0 - $500k</SelectItem>
                    <SelectItem value="500000-1000000">$500k - $1M</SelectItem>
                    <SelectItem value="1000000-2000000">$1M - $2M</SelectItem>
                    <SelectItem value="2000000+">$2M+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}