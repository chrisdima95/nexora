import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';

import { ElettrodomesticiComponent } from './elettrodomestici.component';

describe('ElettrodomesticiComponent', () => {
  let component: ElettrodomesticiComponent;
  let fixture: ComponentFixture<ElettrodomesticiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElettrodomesticiComponent, HttpClientTestingModule],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElettrodomesticiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
