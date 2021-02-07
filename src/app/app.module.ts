import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { MarketOrder } from './components/market-order/market-order.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { TokenComponent } from './components/token/token.component';
import { FlexLayoutModule } from '@angular/flex-layout'
import { LimitOrderComponent } from './components/limit-order/limit-order.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule} from '@angular/material/snack-bar'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCardModule } from '@angular/material/card';

@NgModule({
  declarations: [
    AppComponent,
    MarketOrder,
    TokenComponent,
    LimitOrderComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FlexLayoutModule,

    // Material & CDK
    MatInputModule,
    MatAutocompleteModule,
    ScrollingModule,
    MatTabsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
