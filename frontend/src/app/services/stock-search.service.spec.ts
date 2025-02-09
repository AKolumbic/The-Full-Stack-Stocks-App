import { TestBed } from '@angular/core/testing';

import { StockSearchService } from './stock-search.service';

describe('StockSearchService', () => {
  let service: StockSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockSearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
