import httpx
from typing import Optional, Tuple, List, Dict
from app.core.config import settings

class GeocodingService:
    
    GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
    NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
    
    @staticmethod
    async def geocode_address(address: str, ciudad: str = "", pais: str = "Argentina") -> Optional[Tuple[float, float]]:
        """
        Geocodes an address. Returns (latitude, longitude) or None.
        Uses Google Maps first, Nominatim as fallback.
        """
        full_address = f"{address}, {ciudad}, {pais}".strip(", ")
        
        # Try 1: Google Maps
        if settings.GOOGLE_MAPS_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(
                        GeocodingService.GOOGLE_GEOCODING_URL,
                        params={"address": full_address, "key": settings.GOOGLE_MAPS_API_KEY, "region": "ar"}
                    )
                    data = resp.json()
                    if data.get("status") == "OK" and data.get("results"):
                        loc = data["results"][0]["geometry"]["location"]
                        return loc["lat"], loc["lng"]
            except Exception as e:
                print(f"Google geocoding failed: {e}")
        
        # Fallback: Nominatim (OpenStreetMap)
        try:
            async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "FrigoApp/2.0"}) as client:
                resp = await client.get(
                    GeocodingService.NOMINATIM_URL,
                    params={"q": full_address, "format": "json", "limit": 1, "countrycodes": "ar"}
                )
                data = resp.json()
                if data:
                    return float(data[0]["lat"]), float(data[0]["lon"])
        except Exception as e:
            print(f"Nominatim geocoding failed: {e}")
        
        return None

    @staticmethod
    async def optimize_route(
        origin: Tuple[float, float],
        waypoints: List[Tuple[float, float]],
        destination: Optional[Tuple[float, float]] = None
    ) -> Dict:
        """
        Optimizes routes using Google Routes API v2.
        origin: coordinates of depot (tenant location)
        waypoints: coordinates list of customers to visit
        destination: if None, returns to origin
        
        Returns: {
            "waypoint_order": [reordered indices],
            "total_distance_km": float,
            "total_duration_min": int,
            "polyline": str (encoded polyline)
        }
        """
        if not settings.GOOGLE_MAPS_API_KEY:
            # Fallback: greedy nearest neighbor
            return GeocodingService._greedy_tsp(origin, waypoints, destination)
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline,routes.optimizedIntermediateWaypointIndex"
        }
        
        body = {
            "origin": {"location": {"latLng": {"latitude": origin[0], "longitude": origin[1]}}},
            "destination": {
                "location": {"latLng": {
                    "latitude": destination[0] if destination else origin[0],
                    "longitude": destination[1] if destination else origin[1]
                }}
            },
            "intermediates": [
                {"location": {"latLng": {"latitude": lat, "longitude": lng}}}
                for lat, lng in waypoints
            ],
            "travelMode": "DRIVE",
            "optimizeWaypointOrder": True,
            "routingPreference": "TRAFFIC_AWARE"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(GeocodingService.GOOGLE_ROUTES_URL, json=body, headers=headers)
                data = resp.json()
                
                if "routes" in data and data["routes"]:
                    route = data["routes"][0]
                    # Google returns indices in order of visit. 
                    # If optimizedIntermediateWaypointIndex is missing or empty, it means they are visited in default order.
                    order = route.get("optimizedIntermediateWaypointIndex", list(range(len(waypoints))))
                    return {
                        "waypoint_order": order,
                        "total_distance_km": route.get("distanceMeters", 0) / 1000.0,
                        "total_duration_min": int(route.get("duration", "0s").replace("s", "")) // 60,
                        "polyline": route.get("polyline", {}).get("encodedPolyline", "")
                    }
        except Exception as e:
            print(f"Google Routes API failed: {e}")
        
        return GeocodingService._greedy_tsp(origin, waypoints, destination)
    
    @staticmethod
    def _greedy_tsp(origin: Tuple[float, float], waypoints: List[Tuple[float, float]], destination: Optional[Tuple[float, float]] = None) -> Dict:
        """
        Greedy nearest neighbor TSP algorithm as fallback.
        """
        import math
        
        def haversine(p1, p2):
            R = 6371
            lat1, lon1 = math.radians(p1[0]), math.radians(p1[1])
            lat2, lon2 = math.radians(p2[0]), math.radians(p2[1])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
            return R * 2 * math.asin(math.sqrt(a))
        
        remaining = list(range(len(waypoints)))
        order = []
        current = origin
        total_km = 0.0
        
        while remaining:
            nearest = min(remaining, key=lambda i: haversine(current, waypoints[i]))
            total_km += haversine(current, waypoints[nearest])
            current = waypoints[nearest]
            order.append(nearest)
            remaining.remove(nearest)
        
        dest = destination if destination else origin
        total_km += haversine(current, dest)
        
        return {
            "waypoint_order": order,
            "total_distance_km": round(total_km, 2),
            "total_duration_min": int(total_km * 2),  # estimate ~30km/h average urban speed
            "polyline": ""
        }
