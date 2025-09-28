import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentPolicy } from "@/contexts/CurrentPolicyContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// City coordinates mapping for major Indian cities
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  "Mumbai": { lat: 19.0760, lng: 72.8777 },
  "Delhi": { lat: 28.7041, lng: 77.1025 },
  "Bangalore": { lat: 12.9716, lng: 77.5946 },
  "Chennai": { lat: 13.0827, lng: 80.2707 },
  "Kolkata": { lat: 22.5726, lng: 88.3639 },
  "Hyderabad": { lat: 17.3850, lng: 78.4867 },
  "Pune": { lat: 18.5204, lng: 73.8567 },
  "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "Jaipur": { lat: 26.9124, lng: 75.7873 },
  "Lucknow": { lat: 26.8467, lng: 80.9462 },
  "Patna": { lat: 25.5941, lng: 85.1376 },
  "Bhopal": { lat: 23.2599, lng: 77.4126 },
  "Indore": { lat: 22.7196, lng: 75.8577 },
  "Kanpur": { lat: 26.4499, lng: 80.3319 },
  "Nagpur": { lat: 21.1458, lng: 79.0882 },
  "Surat": { lat: 21.1702, lng: 72.8311 },
  "Visakhapatnam": { lat: 17.6868, lng: 83.2185 },
  "Kochi": { lat: 9.9312, lng: 76.2673 },
  "Coimbatore": { lat: 11.0168, lng: 76.9558 },
  "Vadodara": { lat: 22.3072, lng: 73.1812 }
};

export default function EmotionMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const { currentPolicy } = useCurrentPolicy();

  // Fetch geographical data for the current policy
  const { data: geographicalData, isLoading: isLoadingGeoData } = useQuery({
    queryKey: ["/api/geographical-data", currentPolicy?.id],
    queryFn: async () => {
      const response = await fetch(`/api/geographical-data?policyId=${currentPolicy?.id || ''}`);
      if (!response.ok) throw new Error('Failed to fetch geographical data');
      return response.json();
    },
    enabled: !!currentPolicy?.id,
  });

  const getDominantEmotion = (stats: any) => {
    if (!stats) return { emotion: 'neutral', color: '#6b7280', emoji: '😐' };
    
    // Map processed geographical data fields (happy/angry from database positive/negative)
    const emotions = { 
      happy: stats.happy || 0, 
      angry: stats.angry || 0, 
      neutral: stats.neutral || 0, 
      suggestion: stats.suggestion || 0 
    };
    const max = Math.max(...Object.values(emotions));
    
    
    if (emotions.angry === max) return { emotion: 'angry', color: '#ef4444', emoji: '😡' };
    if (emotions.happy === max) return { emotion: 'happy', color: '#10b981', emoji: '😀' };
    if (emotions.suggestion === max) return { emotion: 'suggestion', color: '#3b82f6', emoji: '💡' };
    return { emotion: 'neutral', color: '#6b7280', emoji: '😐' };
  };

  const getIntensity = (stats: any) => {
    if (!stats) return 0.3; // Default intensity
    const total = (stats.happy || 0) + (stats.angry || 0) + (stats.neutral || 0) + (stats.suggestion || 0);
    return Math.min(total / 20, 1); // Normalize to 0-1, scale based on total votes
  };

  // Process geographical data for map visualization
  const processGeographicalData = () => {
    if (!geographicalData || !Array.isArray(geographicalData)) return [];
    
    return geographicalData.map((location: any) => {
      // Use coordinates from the API response or fallback to city coordinates
      let coordinates = { lat: location.lat, lng: location.lng };
      
      // If no coordinates in response, try to get from city mapping
      if (!coordinates.lat || !coordinates.lng) {
        const cityCoords = cityCoordinates[location.city];
        if (cityCoords) {
          coordinates = cityCoords;
        } else {
          // Add small random offset to prevent overlapping at fallback location
          const randomOffset = () => (Math.random() - 0.5) * 2; // Random offset between -1 and 1
          coordinates = { 
            lat: 20.5937 + randomOffset(), 
            lng: 78.9629 + randomOffset() 
          };
        }
      }
      
      // Calculate percentages for display
      const total = location.happy + location.angry + location.neutral + location.suggestion;
      const processed = {
        city: location.city,
        state: location.state,
        lat: coordinates.lat,
        lng: coordinates.lng,
        happy: location.happy || 0,
        angry: location.angry || 0,
        neutral: location.neutral || 0,
        suggestion: location.suggestion || 0,
        total: total,
        happyPct: total > 0 ? Math.round((location.happy / total) * 100) : 0,
        angryPct: total > 0 ? Math.round((location.angry / total) * 100) : 0,
        neutralPct: total > 0 ? Math.round((location.neutral / total) * 100) : 0,
        suggestionPct: total > 0 ? Math.round((location.suggestion / total) * 100) : 0,
      };
      
      return processed;
    });
  };

  // Create cloud-like SVG path
  const createCloudPath = (size: number) => {
    const s = size;
    return `M ${s*0.2} ${s*0.5} 
            C ${s*0.2} ${s*0.3}, ${s*0.4} ${s*0.2}, ${s*0.5} ${s*0.2}
            C ${s*0.6} ${s*0.1}, ${s*0.8} ${s*0.2}, ${s*0.8} ${s*0.4}
            C ${s*0.9} ${s*0.3}, ${s*1.1} ${s*0.4}, ${s*1.0} ${s*0.6}
            C ${s*1.1} ${s*0.7}, ${s*0.9} ${s*0.8}, ${s*0.8} ${s*0.7}
            C ${s*0.7} ${s*0.9}, ${s*0.5} ${s*0.8}, ${s*0.4} ${s*0.7}
            C ${s*0.2} ${s*0.8}, ${s*0.1} ${s*0.6}, ${s*0.2} ${s*0.5} Z`;
  };

  useEffect(() => {
    if (!mapRef.current || isLoadingGeoData) return;

    // Clear existing map if it exists
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }

    // Initialize map
    leafletMap.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);

    // Add tile layer with a darker style for better cloud visibility
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO'
    }).addTo(leafletMap.current);

    // Process real geographical data from database
    const cityData = processGeographicalData();
    
    if (cityData.length === 0) return;

    // Add emotion clouds for each city
    cityData.forEach(city => {
      const dominant = getDominantEmotion(city);
      const intensity = getIntensity(city); // Use city data for intensity, not voteStats
      const cloudSize = 25 + (intensity * 35); // Scale cloud size based on voting activity

      // Create multiple overlapping circles to simulate cloud effect
      const cloudLayers: L.Circle[] = [];
      
      // Main cloud body - larger circle
      const mainCloud = L.circle([city.lat, city.lng], {
        color: dominant.color,
        fillColor: dominant.color,
        fillOpacity: 0.4 + (intensity * 0.3),
        radius: cloudSize * 1000,
        weight: 0
      }).addTo(leafletMap.current!);
      cloudLayers.push(mainCloud);

      // Add smaller overlapping circles for cloud effect
      const offsets = [
        { lat: 0.15, lng: 0.2, size: 0.7 },
        { lat: -0.1, lng: 0.3, size: 0.6 },
        { lat: 0.2, lng: -0.15, size: 0.65 },
        { lat: -0.05, lng: -0.25, size: 0.55 }
      ];

      offsets.forEach(offset => {
        const subCloud = L.circle([
          city.lat + offset.lat, 
          city.lng + offset.lng
        ], {
          color: dominant.color,
          fillColor: dominant.color,
          fillOpacity: (0.3 + (intensity * 0.2)) * offset.size,
          radius: cloudSize * offset.size * 1000,
          weight: 0
        }).addTo(leafletMap.current!);
        cloudLayers.push(subCloud);
      });

      // Add glow effect with larger, more transparent circle
      const glowCloud = L.circle([city.lat, city.lng], {
        color: dominant.color,
        fillColor: dominant.color,
        fillOpacity: 0.1,
        radius: cloudSize * 1.5 * 1000,
        weight: 0
      }).addTo(leafletMap.current!);

      // Create popup with real data
      const popup = L.popup({
        closeButton: false,
        className: 'emotion-popup'
      }).setContent(`
        <div class="p-4 min-w-[200px]">
          <h3 class="font-bold text-lg mb-3 flex items-center">
            ${dominant.emoji} ${city.city}
          </h3>
          <p class="text-sm mb-3 text-gray-600">Current mood: <span class="font-semibold">${dominant.emotion}</span></p>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm">😀 Happy:</span>
              <span class="font-semibold">${city.happy} votes</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm">😡 Angry:</span>
              <span class="font-semibold">${city.angry} votes</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm">😐 Neutral:</span>
              <span class="font-semibold">${city.neutral} votes</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm">💡 Ideas:</span>
              <span class="font-semibold">${city.suggestion} votes</span>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t text-xs text-gray-500">
            Total engagement: ${city.happy + city.angry + city.neutral + city.suggestion} votes
          </div>
        </div>
      `);

      // Add hover and click events to all cloud layers
      cloudLayers.forEach(layer => {
        layer.bindPopup(popup);
        layer.on('mouseover', function() {
          this.setStyle({
            fillOpacity: this.options.fillOpacity! + 0.2
          });
        });
        layer.on('mouseout', function() {
          this.setStyle({
            fillOpacity: this.options.fillOpacity! - 0.2
          });
        });
        layer.on('click', () => {
          console.log('Clicked on city:', city);
          setSelectedCity(city);
        });
      });
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [geographicalData, isLoadingGeoData, currentPolicy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="emotion-map-title">
          e.Sameekshak Map
        </h1>
        <p className="text-muted-foreground">
          Explore emotional responses to policies across India. Colors represent dominant moods in each region.
        </p>
      </div>

      {/* Current Policy Info */}
      {currentPolicy && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Current Policy</h2>
                <p className="text-sm text-muted-foreground">{currentPolicy.title}</p>
              </div>
              <Badge className="bg-primary text-primary-foreground">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Interactive Map</span>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Happy</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Angry</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span>Neutral</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Suggestions</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={mapRef} 
                className="h-96 w-full rounded-lg border border-border"
                data-testid="emotion-map"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Click on colored clouds to view detailed emotion data for each city
              </p>
            </CardContent>
          </Card>
        </div>

        {/* City Details Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>City Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCity ? (
                <div className="space-y-4" data-testid="city-details">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{selectedCity.city}</h3>
                    <p className="text-sm text-muted-foreground">Emotion breakdown</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">😀 Happy</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${selectedCity.happyPct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedCity.happyPct}%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">😡 Angry</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${selectedCity.angryPct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedCity.angryPct}%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">😐 Neutral</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div 
                            className="bg-gray-500 h-2 rounded-full"
                            style={{ width: `${selectedCity.neutralPct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedCity.neutralPct}%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">💡 Suggestions</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${selectedCity.suggestionPct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedCity.suggestionPct}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-border">
                    <div className="text-center">
                      <div className="text-2xl mb-1">{getDominantEmotion(selectedCity).emoji}</div>
                      <div className="text-sm font-medium text-foreground">
                        Dominant: {getDominantEmotion(selectedCity).emotion}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <div className="text-4xl mb-2">🗺️</div>
                  <p className="text-sm">Click on a city to view detailed emotion data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}