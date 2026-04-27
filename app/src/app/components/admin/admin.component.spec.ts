import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminComponent } from './admin.component';
import { UserService } from '../../services/user.service';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('UserService', ['findPendingRecruiters', 'findAllUsers', 'approveRecruiter', 'rejectRecruiter']);
    spy.findPendingRecruiters.and.returnValue(Promise.resolve([]));
    spy.findAllUsers.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      declarations: [ AdminComponent ],
      imports: [ FormsModule, RouterTestingModule ],
      providers: [
        { provide: UserService, useValue: spy }
      ]
    }).compileComponents();

    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load dashboard data on init', async () => {
    await component.loadDashboardData();
    expect(userServiceSpy.findPendingRecruiters).toHaveBeenCalled();
    expect(userServiceSpy.findAllUsers).toHaveBeenCalled();
  });

  it('should filter users correctly', () => {
    component.pendingRecruiters = [
      { _id: '1', username: 'test1', role: 'Recruiter', createdAt: new Date() },
      { _id: '2', username: 'test2', role: 'Recruiter', createdAt: new Date() }
    ];
    component.searchTerm = 'test1';
    
    const filtered = component.filterUsers();
    expect(filtered.length).toBe(1);
    expect(filtered[0].username).toBe('test1');
  });
});
