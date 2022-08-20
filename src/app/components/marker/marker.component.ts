import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LatLng } from 'src/app/models/lat-lng';

@Component({
  selector: 'app-marker',
  templateUrl: './marker.component.html',
  styleUrls: ['./marker.component.css']
})
export class MarkerComponent implements OnInit {
  @Input() position?: LatLng;
  // @Input() color: string = '#BA7056';
  @Input() draggable: boolean = true;

  @Output() positionChange = new EventEmitter<LatLng>();

  marker: any;
  constructor() { }

  ngOnInit(): void {
  }

}
