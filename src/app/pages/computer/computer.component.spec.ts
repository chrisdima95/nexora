import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';

import { ComputerComponent } from './computer.component';

describe('ComputerComponent', () => {
  let component: ComputerComponent;
  let fixture: ComponentFixture<ComputerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComputerComponent, HttpClientTestingModule],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }]
    }).compileComponents();

    fixture = TestBed.createComponent(ComputerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
