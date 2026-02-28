"use client"

import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { useEffect, useRef } from "react"

type Property = {
  id: string
  title: string
  propertyType: string
  price: number
  currency: string
  latitude: number
  longitude: number
  image: string
}

const sampleProperties: Property[] = [
  {
    id: "1",
    title: "2 Bedroom Apartment",
    propertyType: "Apartment",
    price: 250000000,
    currency: "MNT",
    latitude: 47.8028,
    longitude: 107.3085,
    image: "/mock-properties/re-image1.jpg",
  },
  {
    id: "2",
    title: "House",
    propertyType: "House",
    price: 450000000,
    currency: "MNT",
    latitude: 47.7942,
    longitude: 107.2865,
    image: "/mock-properties/re-image2.jpg",
  },
  {
    id: "3",
    title: "Office",
    propertyType: "Commercial",
    price: 800000000,
    currency: "MNT",
    latitude: 47.9124,
    longitude: 106.9105,
    image: "/mock-properties/re-image3.jpg",
  },
]

const khorooDataUrl = new URL(
  "./khoroo-boundaries.geojson",
  import.meta.url,
).toString()

function formatPrice(price: number, currency: string) {
  return `${new Intl.NumberFormat("en-US").format(price)} ${currency}`
}

export default function MapDemo() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    const container = mapContainerRef.current
    if (mapRef.current || !container) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!token) return

    mapboxgl.accessToken = token

    let disposed = false
    let hoveredFeatureId: string | number | null = null
    const markers: mapboxgl.Marker[] = []
    let resizeObserver: ResizeObserver | null = null

    const init = async () => {
      const response = await fetch(khorooDataUrl)
      const khorooBoundaries =
        (await response.json()) as GeoJSON.FeatureCollection
      if (disposed) return

      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [107.08, 47.86],
        zoom: 9.2,
      })

      mapRef.current = map
      map.addControl(new mapboxgl.NavigationControl(), "top-right")
      requestAnimationFrame(() => {
        if (!disposed) map.resize()
      })

      resizeObserver = new ResizeObserver(() => {
        if (!disposed) map.resize()
      })
      resizeObserver.observe(container)

      map.on("load", () => {
        map.resize()

        map.addSource("khoroos", {
          type: "geojson",
          data: khorooBoundaries,
          promoteId: "AU3_CODE",
        })

        map.addLayer({
          id: "khoroos-fill",
          type: "fill",
          source: "khoroos",
          paint: {
            "fill-color": "#2563eb",
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.35,
              0.03,
            ],
          },
        })

        map.addLayer({
          id: "khoroos-outline",
          type: "line",
          source: "khoroos",
          paint: {
            "line-color": "#2563eb",
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              1.5,
              0.8,
            ],
          },
        })

        map.on("mousemove", "khoroos-fill", (event) => {
          map.getCanvas().style.cursor = "pointer"

          const feature = event.features?.[0]
          if (!feature?.id) return

          if (hoveredFeatureId !== null && hoveredFeatureId !== feature.id) {
            map.setFeatureState(
              { source: "khoroos", id: hoveredFeatureId },
              { hover: false },
            )
          }

          hoveredFeatureId = feature.id
          map.setFeatureState(
            { source: "khoroos", id: hoveredFeatureId },
            { hover: true },
          )
        })

        map.on("mouseleave", "khoroos-fill", () => {
          map.getCanvas().style.cursor = ""
          if (hoveredFeatureId !== null) {
            map.setFeatureState(
              { source: "khoroos", id: hoveredFeatureId },
              { hover: false },
            )
          }
          hoveredFeatureId = null
        })

        for (const property of sampleProperties) {
          const markerEl = document.createElement("button")
          markerEl.type = "button"
          markerEl.className =
            "h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md"
          markerEl.setAttribute("aria-label", property.title)

          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 16,
          }).setHTML(`
            <div style="width:180px;font-family:system-ui,sans-serif;">
              <img src="${property.image}" alt="${property.title}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;" />
              <div style="margin-top:8px;font-size:13px;font-weight:600;">${property.title}</div>
              <div style="font-size:12px;color:#4b5563;">${property.propertyType}</div>
              <div style="margin-top:4px;font-size:12px;color:#111827;">${formatPrice(property.price, property.currency)}</div>
            </div>
          `)

          const marker = new mapboxgl.Marker({ element: markerEl })
            .setLngLat([property.longitude, property.latitude])
            .setPopup(popup)
            .addTo(map)

          markerEl.addEventListener("mouseenter", () => {
            if (!marker.getPopup()?.isOpen()) marker.togglePopup()
          })

          markerEl.addEventListener("mouseleave", () => {
            if (marker.getPopup()?.isOpen()) marker.togglePopup()
          })

          markers.push(marker)
        }
      })
    }

    void init()

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      for (const marker of markers) marker.remove()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  const hasToken = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Mapbox Khoroo Polygon Demo</h1>
        <p className="text-muted-foreground">
          2 properties are in the 1st khoroo and 1 property is in the 2nd khoroo
        </p>
      </div>

      {!hasToken ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Missing <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code>. Add it to render
          the map.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <div ref={mapContainerRef} className="h-140 w-full" />
      </div>
    </div>
  )
}
