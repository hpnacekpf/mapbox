import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { LatLng } from 'src/app/models/lat-lng';
import * as MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { MapMouseEvent, Map, GeolocateControl } from 'mapbox-gl';
import { debounce } from 'lodash-es';
import * as turf from '@turf/helpers';
// import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
declare var require: any;
// var MapboxDirections = require('@mapbox/mapbox-gl-directions');
// import * as MapboxDirections from '@mapbox/mapbox-gl-directions';
// import * as MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

// var directions = new MapboxDirections({
//   accessToken: 'pk.eyJ1IjoiaHBuYWNlMjMwMiIsImEiOiJjbDE0b2Q5enAwY3M0M2RrYXUzenhjaDJlIn0.TNfw5lGqMoE1Q8_x4BVa-g',
//   unit: 'metric',
//   profile: 'mapbox/cycling'
// });

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  map!: Map;
  _mapRef!: any;
  @Input() mapTileKey: string = '';
  @Input() apiKey: string = '';

  private _height!: string;
  @Input()
  set height(height: number | string) {
    if (typeof height === 'number') {
      this._height = height + 'px';
    } else {
      this._height = height;
    }
  }
  get height() {
    return this._height;
  }
  array: any[] = [];

  @Input() center: LatLng = { lng: 105.804817, lat: 21.028511 };
  @Input() center2: LatLng = { lng: 105.824817, lat: 21.038511 };
  @Input() zoom: number = 14;

  // @Output() mapClick = new EventEmitter();
  // @Output() setCenter = new EventEmitter();
  // @Output() setZoom = new EventEmitter();

  constructor() {}

  ngOnInit(): void {}
  mapLoad = async (map: any) => {
    this._mapRef = map;
    var start: any[];
    var end: any[];
    var marker1: any;
    var marker2: any;
    var warehouseLocation: mapboxgl.LngLatLike = [105.804817, 21.038511];
    var lastAtRestaurant = 0;
    var keepTrack = [];
    var pointHopper = {};
    var token =
      'pk.eyJ1IjoiaHBuYWNlMjMwMiIsImEiOiJjbDE0b2Q5enAwY3M0M2RrYXUzenhjaDJlIn0.TNfw5lGqMoE1Q8_x4BVa-g';
    // const truckLocation = [105.804817, 21.038511];
    new mapboxgl.Marker().setLngLat(this.center).addTo(map);

    const warehouse = turf.featureCollection([turf.point(warehouseLocation)]);

    // Create an empty GeoJSON feature collection for drop off locations
    const dropoffs = turf.featureCollection([]);

    // Create an empty GeoJSON feature collection, which will be used as the data source for the route before users add any new data
    const nothing = turf.featureCollection([]);

    map.on('load', async () => {
      // const marker = document.createElement('div');
      // marker.classList = 'truck';

      // Create a new marker
      new mapboxgl.Marker().setLngLat(this.center).addTo(map);

      // Create a circle layer
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

      // Create a symbol layer on top of circle layer
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

      // Listen for a click on the map
      await map.on('click', addWaypoints);
    });

    async function addWaypoints(event: { point: any }) {
      // When the map is clicked, add a new drop off point
      // and update the `dropoffs-symbol` layer
      await newDropoff(map.unproject(event.point));
      updateDropoffs(dropoffs);
    }

    async function newDropoff(coordinates: { lng: number; lat: number }) {
      // Store the clicked point as a new GeoJSON feature with
      // two properties: `orderTime` and `key`
      const pt = turf.point([coordinates.lng, coordinates.lat], {
        orderTime: Date.now(),
        key: Math.random(),
      });
      dropoffs.features.push(pt);
      // pointHopper[pt.properties.key] = pt;

      // Make a request to the Optimization API
      const query = await fetch(assembleQueryURL(), { method: 'GET' });
      const response = await query.json();

      // Create an alert for any requests that return an error
      if (response.code !== 'Ok') {
        const handleMessage =
          response.code === 'InvalidInput'
            ? 'Refresh to start a new route. For more information: https://docs.mapbox.com/api/navigation/optimization/#optimization-api-errors'
            : 'Try a different point.';
        alert(`${response.code} - ${response.message}\n\n${handleMessage}`);
        // Remove invalid point
        dropoffs.features.pop();
        // delete pointHopper[pt.properties.key];
        return;
      }

      // Create a GeoJSON feature collection
      const routeGeoJSON = turf.featureCollection([
        turf.feature(response.trips[0].geometry),
      ]);

      // Update the `route` source by getting the route source
      // and setting the data equal to routeGeoJSON
      map.getSource('route').setData(routeGeoJSON);
    }

    function updateDropoffs(
      geojson: turf.FeatureCollection<turf.Geometry, turf.Properties>
    ) {
      map.getSource('dropoffs-symbol').setData(geojson);
    }

    // Here you'll specify all the parameters necessary for requesting a response from the Optimization API
    const assembleQueryURL = () => {
      // Store the location of the truck in a variable called coordinates
      const coordinates = [this.center];
      const distributions = [];
      let restaurantIndex;
      keepTrack = [this.center];

      // Create an array of GeoJSON feature collections for each point
      const restJobs = Object.keys(pointHopper).map((key) => pointHopper[key]);

      // If there are actually orders from this restaurant
      if (restJobs.length > 0) {
        // Check to see if the request was made after visiting the restaurant
        const needToPickUp =
          restJobs.filter((d) => d.properties.orderTime > lastAtRestaurant)
            .length > 0;

        // If the request was made after picking up from the restaurant,
        // Add the restaurant as an additional stop
        if (needToPickUp) {
          restaurantIndex = coordinates.length;
          // Add the restaurant as a coordinate
          coordinates.push(warehouseLocation);
          // push the restaurant itself into the array
          keepTrack.push(pointHopper.warehouse);
        }

        for (const job of restJobs) {
          // Add dropoff to list
          keepTrack.push(job);
          coordinates.push(job.geometry.coordinates);
          // if order not yet picked up, add a reroute
          if (needToPickUp && job.properties.orderTime > lastAtRestaurant) {
            distributions.push(`${restaurantIndex},${coordinates.length - 1}`);
          }
        }
      }

      // Set the profile to `driving`
      // Coordinates will include the current location of the truck,
      return `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates.join(
        ';'
      )}?distributions=${distributions.join(
        ';'
      )}&overview=full&steps=true&geometries=geojson&source=first&access_token=${token}`;
    };

    // map.on('load', async () => {
    //   const marker = document.createElement('div');
    //   // marker.classList = 'truck';

    //   // Create a new marker
    //   new mapboxgl.Marker().setLngLat(truckLocation).addTo(map);
    // });

    // map.on('click', (event: any) => {
    //   const coords = Object.keys(event.lngLat).map((key) => event.lngLat[key]);
    //   new mapboxgl.Marker({ draggable: true })
    //     .setLngLat([coords[0], coords[1]])
    //     .addTo(map);
    //   this.array.push(coords);
    //   this.getRoute();
    //   // if (!start) {
    //   //   marker1 = new mapboxgl.Marker({ draggable: true })
    //   //     .setLngLat([coords[0], coords[1]])
    //   //     .addTo(map);
    //   //   start = coords;
    //   // } else if (!end) {
    //   //   marker2 = new mapboxgl.Marker({ draggable: true })
    //   //     .setLngLat([coords[0], coords[1]])
    //   //     .addTo(map);
    //   //   end = coords;
    //   // } else {
    //   //   new mapboxgl.Marker({ draggable: true })
    //   //     .setLngLat([coords[0], coords[1]])
    //   //     .addTo(map);
    //   // }

    //   // const onDragEnd1 = () => {
    //   //   const lngLat = marker1.getLngLat();
    //   //   start = [lngLat.lng, lngLat.lat];
    //   //   this.getRoute([lngLat.lng, lngLat.lat], [end[0], end[1]]);
    //   // };

    //   // const onDragEnd2 = () => {
    //   //   const lngLat = marker2.getLngLat();
    //   //   end = [lngLat.lng, lngLat.lat];
    //   //   this.getRoute([start[0], start[1]], [lngLat.lng, lngLat.lat]);
    //   // };

    //   // marker1.on('dragend', onDragEnd1);
    //   // marker2.on('dragend', onDragEnd2);

    //   // if (start && end) {
    //   //   this.getRoute([start[0], start[1]], [end[0], end[1]]);
    //   // }
    //   // const end = {
    //   //   type: 'FeatureCollection',
    //   //   features: [
    //   //     {
    //   //       type: 'Feature',
    //   //       properties: {},
    //   //       geometry: {
    //   //         type: 'Point',
    //   //         coordinates: coords,
    //   //       },
    //   //     },
    //   //   ],
    //   // };
    //   // if (map.getLayer('end')) {
    //   //   map.getSource('end').setData(end);
    //   // } else {
    //   //   map.addLayer({
    //   //     id: 'end',
    //   //     type: 'circle',
    //   //     source: {
    //   //       type: 'geojson',
    //   //       data: {
    //   //         type: 'FeatureCollection',
    //   //         features: [
    //   //           {
    //   //             type: 'Feature',
    //   //             properties: {},
    //   //             geometry: {
    //   //               type: 'Point',
    //   //               coordinates: coords,
    //   //             },
    //   //           },
    //   //         ],
    //   //       },
    //   //     },
    //   //     paint: {
    //   //       'circle-radius': 10,
    //   //       'circle-color': '#f30',
    //   //     },
    //   //   });
    //   // }
    //   // getRoute(coords);
    // });
  };

  getRoute = async () => {
    // 105.804117,21.028511;105.814217,21.021511;105.807317,21.022511
    var token =
      'pk.eyJ1IjoiaHBuYWNlMjMwMiIsImEiOiJjbDE0b2Q5enAwY3M0M2RrYXUzenhjaDJlIn0.TNfw5lGqMoE1Q8_x4BVa-g';

    var marker: string = '';
    this.array.map((item: any) => {
      console.log(item[0].toString());
      marker + item[0].toString();
      console.log(marker + item[0].toString());
    });
    console.log(marker);
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/cycling/105.804117,21.028511;105.814217,21.021511;105.807317,21.022511?steps=true&geometries=geojson&access_token=${token}`,
      { method: 'GET' }
    );
    const json = await query.json();

    // console.log(json);
    const data = json.routes[0];
    const route = data.geometry.coordinates;
    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: route,
      },
    };
    // if the route already exists on the map, we'll reset it using setData
    if (this._mapRef.getSource('route')) {
      this._mapRef.getSource('route').setData(geojson);
    }
    // otherwise, we'll make a new request
    else {
      this._mapRef.addLayer({
        id: 'route',
        type: 'line',
        source: {
          type: 'geojson',
          data: geojson,
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3887be',
          'line-width': 5,
          'line-opacity': 0.75,
        },
      });
    }
    // const query = await fetch(
    //   `https://api.mapbox.com/directions/v5/mapbox/cycling/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${token}`,
    // )
  };

  // markerDragEnd(e: any) {
  //   this.center = { lng: e._lngLat.lng, lat: e._lngLat.lat };
  //   this.getRoute(
  //     [this.center.lng, this.center.lat],
  //     [this.center2.lng, this.center2.lat]
  //   );
  // }

  // markerDragEnd2(e: any) {
  //   this.center2 = { lng: e._lngLat.lng, lat: e._lngLat.lat };
  //   this.getRoute(
  //     [this.center.lng, this.center.lat],
  //     [this.center2.lng, this.center2.lat]
  //   );
  // }
}
