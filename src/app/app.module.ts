import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MapComponent } from './components/map/map.component';
import { NgxMapboxGLModule } from 'ngx-mapbox-gl';
import { MarkerComponent } from './components/marker/marker.component';

@NgModule({
  declarations: [AppComponent, MapComponent, MarkerComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxMapboxGLModule.withConfig({
      accessToken:
        'pk.eyJ1IjoiaHBuYWNlMjMwMiIsImEiOiJjbDE0bzFpYWYwbDU0M2pvajNxZTBnZjd3In0.HFL8GRWEsUNfsGpqHPJB_Q',
    }),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
