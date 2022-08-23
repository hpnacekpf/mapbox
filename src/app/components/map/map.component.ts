import { Component, Input, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { LatLng } from 'src/app/models/lat-lng';
import { Map } from 'mapbox-gl';
import * as turf from '@turf/helpers';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  map!: Map;

  @Input() center: LatLng = { lng: 105.824817, lat: 21.028511 };
  @Input() zoom: number = 14;

  constructor() {}

  ngOnInit(): void {}
  mapLoad = async (map: any) => {
    var warehouseLocation: any = [105.814817, 21.038511];
    var lastAtRestaurant = 0;
    var keepTrack = [];
    var pointHopper: any = {};
    var token =
      'pk.eyJ1IjoiaHBuYWNlMjMwMiIsImEiOiJjbDE0b2Q5enAwY3M0M2RrYXUzenhjaDJlIn0.TNfw5lGqMoE1Q8_x4BVa-g';

    const warehouse = turf.featureCollection([turf.point(warehouseLocation)]);
    const dropoffs = turf.featureCollection([]);
    const nothing = turf.featureCollection([]);

    map.loadImage(
      '../../../assets/img/PngItem_5290529.png',
      function (error: any, image: any) {
        if (error) throw error;
        map.addImage('custom-marker', image);
      }
    );

    map.addLayer({
      id: 'field-service',
      type: 'symbol',
      source: {
        data: {
          geometry: {
            type: 'Point',
            coordinates: [this.center.lng, this.center.lat],
          },
          type: 'Feature',
        },
        type: 'geojson',
      },
      layout: {
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-image': 'custom-marker',
        'icon-size': 0.08,
      },
    });

    map.addLayer({
      id: 'warehouse',
      type: 'circle',
      source: {
        data: warehouse,
        type: 'geojson',
      },
      paint: {
        'circle-radius': 20,
        'circle-color': 'white',
        'circle-stroke-color': '#3887be',
        'circle-stroke-width': 3,
      },
    });

    map.addLayer({
      id: 'warehouse-symbol',
      type: 'symbol',
      source: {
        data: warehouse,
        type: 'geojson',
      },
      layout: {
        'icon-image': 'grocery-15',
        'icon-size': 1,
      },
      paint: {
        'text-color': '#3887be',
      },
    });

    map.addLayer({
      id: 'dropoffs-symbol',
      type: 'symbol',
      source: {
        data: dropoffs,
        type: 'geojson',
      },
      layout: {
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-image': 'marker-15',
      },
    });

    map.addSource('route', {
      type: 'geojson',
      data: nothing,
    });

    map.addLayer(
      {
        id: 'routeline-active',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3887be',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 22, 12],
        },
      },
      'waterway-label'
    );

    map.addLayer(
      {
        id: 'routearrows',
        type: 'symbol',
        source: 'route',
        layout: {
          'symbol-placement': 'line',
          'text-field': '▶',
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 24, 22, 60],
          'symbol-spacing': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12,
            30,
            22,
            160,
          ],
          'text-keep-upright': false,
        },
        paint: {
          'text-color': '#3887be',
          'text-halo-color': 'hsl(55, 11%, 96%)',
          'text-halo-width': 3,
        },
      },
      'waterway-label'
    );

    await map.on('click', addWaypoints);

    async function addWaypoints(event: { lngLat: any }) {
      new mapboxgl.Marker().setLngLat(event.lngLat).addTo(map);
      await newDropoff(event.lngLat);
      updateDropoffs(dropoffs);
    }

    async function newDropoff(coordinates: { lng: number; lat: number }) {
      const pt = turf.point([coordinates.lng, coordinates.lat], {
        orderTime: Date.now(),
        key: Math.random(),
      });
      dropoffs.features.push(pt);
      pointHopper[pt.properties.key] = pt;

      const query = await fetch(assembleQueryURL(), { method: 'GET' });
      const response = await query.json();

      if (response.code !== 'Ok') {
        const handleMessage =
          response.code === 'InvalidInput'
            ? 'Refresh to start a new route. For more information: https://docs.mapbox.com/api/navigation/optimization/#optimization-api-errors'
            : 'Try a different point.';
        alert(`${response.code} - ${response.message}\n\n${handleMessage}`);
        dropoffs.features.pop();
        delete pointHopper[pt.properties.key];
        return;
      }

      const routeGeoJSON = turf.featureCollection([
        turf.feature(response.trips[0].geometry),
      ]);

      map.getSource('route').setData(routeGeoJSON);
    }

    function updateDropoffs(
      geojson: turf.FeatureCollection<turf.Geometry, turf.Properties>
    ) {
      map.getSource('dropoffs-symbol').setData(geojson);
    }

    const assembleQueryURL = () => {
      const coordinates = [[this.center.lng, this.center.lat]];
      const distributions = [];
      let restaurantIndex;
      keepTrack = [this.center];
      const restJobs = Object.keys(pointHopper).map((key) => pointHopper[key]);
      if (restJobs.length > 0) {
        const needToPickUp =
          restJobs.filter((d) => d.properties.orderTime > lastAtRestaurant)
            .length > 0;
        if (needToPickUp) {
          restaurantIndex = coordinates.length;
          coordinates.push(warehouseLocation);
          keepTrack.push(pointHopper.warehouse);
        }

        for (const job of restJobs) {
          keepTrack.push(job);
          coordinates.push(job.geometry.coordinates);
          if (needToPickUp && job.properties.orderTime > lastAtRestaurant) {
            distributions.push(`${restaurantIndex},${coordinates.length - 1}`);
          }
        }
      }
      return `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates.join(
        ';'
      )}?distributions=${distributions.join(
        ';'
      )}&overview=full&steps=true&geometries=geojson&source=first&access_token=${token}`;
    };
  };
}
