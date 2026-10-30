import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';

import { TelefoniComponent } from './telefoni.component';

describe('TelefoniComponent', () => {
  let component: TelefoniComponent;
  let fixture: ComponentFixture<TelefoniComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelefoniComponent, HttpClientTestingModule],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TelefoniComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
