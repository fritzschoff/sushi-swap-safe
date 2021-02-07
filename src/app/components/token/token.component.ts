import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { tokens } from 'src/assets/tokens';
import { startWith, map } from 'rxjs/operators'
import { Observable } from 'rxjs';

@Component({
  selector: '[token] token',
  templateUrl: 'token.component.html',
  styleUrls: ['./token.component.scss']
})
export class TokenComponent implements OnInit {

  @Input() token: FormControl;

  @Input() label: string;

  @Input() withOutEth: boolean;

  tokens;
  filteredOptions$: Observable<typeof tokens>;

  ngOnInit() {
    this.tokens = this.withOutEth ? tokens.filter(token => token.symbol !== 'ETH') : tokens
    this.filteredOptions$ = this.token.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value))
    );
  }

  tokenFunc(token) {
    if (token) return token.symbol
    return ''
  }

  private _filter(value: string): typeof tokens {
    if (typeof value === 'string') {
      const filterValue = value.toLowerCase();
      return this.tokens.filter(option => option.symbol.toLowerCase().indexOf(filterValue) === 0);
    }
  }
}
