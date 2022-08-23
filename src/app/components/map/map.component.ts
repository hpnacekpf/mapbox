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

  @Input() center: LatLng = { lng: 105.824817, lat: 21.028511 };
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
    var warehouseLocation: any = [105.814817, 21.038511];
    var lastAtRestaurant = 0;
    var keepTrack = [];
    var pointHopper: any = {};
    var token =
      'pk.eyJ1IjoiaHBuYWNlMjMwMiIsImEiOiJjbDE0b2Q5enAwY3M0M2RrYXUzenhjaDJlIn0.TNfw5lGqMoE1Q8_x4BVa-g';
    // const truckLocation = [105.804817, 21.038511];
    // new mapboxgl.Marker().setLngLat(this.center).addTo(map);
    console.log(turf);

    const warehouse = turf.featureCollection([turf.point(warehouseLocation)]);
    console.log(warehouse);

    // Create an empty GeoJSON feature collection for drop off locations
    // Tạo một bộ sưu tập tính năng GeoJSON trống cho các địa điểm trả khách
    // const dropoffs = turf.featureCollection([]);
    const dropoffs = turf.featureCollection([]);
    console.log(dropoffs);

    // Create an empty GeoJSON feature collection, which will be used as the data source for the route before users add any new data
    // Tạo một bộ sưu tập tính năng GeoJSON trống, bộ sưu tập này sẽ được sử dụng làm nguồn dữ liệu cho tuyến đường trước khi người dùng thêm bất kỳ dữ liệu mới nào
    const nothing = turf.featureCollection([]);
    console.log(nothing);
    // const marker = document.createElement('div');
    // marker.classList = 'truck';

    map.loadImage(
      '../../../assets/img/PngItem_5290529.png',
      function (error: any, image: any) {
        if (error) throw error;
        map.addImage('custom-marker', image);
      }
    );
    // Create a new marker

    map.addLayer({
      id: 'field-service',
      type: 'symbol',
      source: {
        data: {
          geometry: { type: 'Point', coordinates: [this.center.lng, this.center.lat] },
          type: 'Feature',
        },
        type: 'geojson',
      },
      layout: {
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-image': 'custom-marker',
        'icon-size': 0.1,
      },
    });

    // Create a circle layer
    // Tạo một lớp hình tròn
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
    // Tạo một lớp biểu tượng trên đầu lớp hình tròn
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

    // thêm hiển thị điểm đến trên map
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
        // 'icon-image': 'custom-marker',
        // 'icon-size': 0.15,
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
    // });

    // const onDragEnd = async (e: any) => {
    //   console.log(e.target._map._markers);
    //   var newDropoffs: any[] = [];
    //   console.log(dropoffs.features);
    //   if (e.target._map._markers.length > dropoffs.features.length) {
    //     newDropoffs = e.target._map._markers.splice(0, 2);
    //     console.log(newDropoffs);
    //   }

    //   if (e.target._map._markers.length === dropoffs.features.length) {
    //     dropoffs.features.map((item, index) => {
    //       e.target._map._markers.map((marker: any) => {
    //         item.geometry.coordinates = [
    //           marker._lngLat.lng,
    //           marker._lngLat.lat,
    //         ];
    //         if (e.target._map._markers.length !== dropoffs.features.length) {
    //           if (item.geometry.coordinates[0] !== marker._lngLat.lng) {
    //             dropoffs.features.slice(index, 1);
    //           }
    //         }
    //         // console.log(item.geometry.coordinates = [marker._lngLat.lng, marker._lngLat.lat])
    //         // console.log(marker._lngLat)
    //       });
    //     });
    //   }
    //   const pt = turf.point([e.target._lngLat.lng, e.target._lngLat.lat], {
    //     orderTime: Date.now(),
    //     // key: Math.random(),
    //   });
    //   console.log(pt);
    //   // dropoffs.features.pop();
    //   console.log(dropoffs);
    //   // delete pointHopper[pt.properties.key];
    //   await newDropoff(e.target._lngLat);
    //   updateDropoffs(dropoffs);
    //   console.log(dropoffs);
    // };

    async function addWaypoints(event: { lngLat: any }) {
      console.log(event);
      // When the map is clicked, add a new drop off point
      // and update the `dropoffs-symbol` layer
      // Khi nhấp vào bản đồ, hãy thêm một điểm trả khách mới
      // và cập nhật lớp `droppoffs-symbol`
      console.log(event.lngLat);
      new mapboxgl.Marker().setLngLat(event.lngLat).addTo(map);
      // .on('dragend', onDragEnd);
      await newDropoff(event.lngLat);
      updateDropoffs(dropoffs);
    }

    async function newDropoff(coordinates: { lng: number; lat: number }) {
      console.log(coordinates);
      // Store the clicked point as a new GeoJSON feature with
      // two properties: `orderTime` and `key`
      // Lưu trữ điểm đã nhấp dưới dạng tính năng GeoJSON mới với
      // hai thuộc tính: `orderTime` và` key`
      const pt = turf.point([coordinates.lng, coordinates.lat], {
        orderTime: Date.now(),
        key: Math.random(),
      });
      console.log(pt);
      dropoffs.features.push(pt);
      pointHopper[pt.properties.key] = pt;

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
        delete pointHopper[pt.properties.key];
        return;
      }

      // Create a GeoJSON feature collection
      // Tạo bộ sưu tập tính năng GeoJSON
      const routeGeoJSON = turf.featureCollection([
        turf.feature(response.trips[0].geometry),
      ]);

      // Update the `route` source by getting the route source
      // and setting the data equal to routeGeoJSON
      // Cập nhật nguồn `tuyến đường` bằng cách lấy nguồn tuyến
      // và đặt dữ liệu bằng routeGeoJSON
      map.getSource('route').setData(routeGeoJSON);
    }

    function updateDropoffs(
      geojson: turf.FeatureCollection<turf.Geometry, turf.Properties>
    ) {
      console.log(dropoffs);
      map.getSource('dropoffs-symbol').setData(geojson);
    }

    // Here you'll specify all the parameters necessary for requesting a response from the Optimization API
    // Tại đây, bạn sẽ chỉ định tất cả các tham số cần thiết để yêu cầu phản hồi từ API tối ưu hóa
    const assembleQueryURL = () => {
      // Store the location of the truck in a variable called coordinates
      // Lưu trữ vị trí của xe tải trong một biến có tên là tọa độ
      const coordinates = [[this.center.lng, this.center.lat]];
      const distributions = [];
      let restaurantIndex;
      keepTrack = [this.center];

      // Create an array of GeoJSON feature collections for each point
      // Tạo một mảng các bộ sưu tập tính năng GeoJSON cho mỗi điểm
      const jobs: any = [...dropoffs.features];
      // console.log(Object.keys(pointHopper).map((key) => pointHopper[key]));
      // const restJobs = Object.keys(pointHopper).map((key) => pointHopper[key]);
      // console.log(dropoffs.features);
      // console.log('restJobs', restJobs);

      // If there are actually orders from this restaurant
      // Nếu thực sự có đơn đặt hàng từ nhà hàng này
      if (jobs.length > 0) {
        // Check to see if the request was made after visiting the restaurant
        // Kiểm tra xem yêu cầu có được thực hiện sau khi đến nhà hàng hay không
        const needToPickUp =
          jobs.filter((d: any) => d.properties.orderTime > lastAtRestaurant)
            .length > 0;

        // If the request was made after picking up from the restaurant,
        // Add the restaurant as an additional stop
        // Nếu yêu cầu được đưa ra sau khi đón khách từ nhà hàng,
        // Thêm nhà hàng làm điểm dừng bổ sung
        if (needToPickUp) {
          restaurantIndex = coordinates.length;
          // Add the restaurant as a coordinate
          // Thêm nhà hàng làm tọa độ
          coordinates.push(warehouseLocation);
          // push the restaurant itself into the array
          // đẩy chính nhà hàng vào mảng
          keepTrack.push(pointHopper.warehouse);
        }

        for (const job of jobs) {
          // Add dropoff to list
          // Thêm người bỏ qua vào danh sách
          keepTrack.push(job);
          coordinates.push(job.geometry.coordinates);
          // if order not yet picked up, add a reroute
          // nếu đơn hàng chưa được nhận, hãy thêm tuyến đường
          if (needToPickUp && job.properties.orderTime > lastAtRestaurant) {
            distributions.push(`${restaurantIndex},${coordinates.length - 1}`);
            // console.log(distributions);
          }
        }
      }

      // Set the profile to `driving`
      // Coordinates will include the current location of the truck,
      // Đặt cấu hình thành `drive`
      // Tọa độ sẽ bao gồm vị trí hiện tại của xe tải,
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
