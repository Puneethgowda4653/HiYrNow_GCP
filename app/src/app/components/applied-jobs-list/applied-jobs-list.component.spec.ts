import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppliedJobsListComponent } from './applied-jobs-list.component';
import { Router } from '@angular/router';
import { JobPostingService } from '../../services/job-posting.service';
import { UserService } from '../../services/user.service';
import { of } from 'rxjs';

describe('AppliedJobsListComponent', () => {
  let component: AppliedJobsListComponent;
  let fixture: ComponentFixture<AppliedJobsListComponent>;
  let jobServiceSpy: jasmine.SpyObj<JobPostingService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const jSpy = jasmine.createSpyObj('JobPostingService', ['getAllJobsAppliedByUser']);
    const uSpy = jasmine.createSpyObj('UserService', ['findLoggedUser']);
    const rSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [ AppliedJobsListComponent ],
      providers: [
        { provide: JobPostingService, useValue: jSpy },
        { provide: UserService, useValue: uSpy },
        { provide: Router, useValue: rSpy }
      ]
    }).compileComponents();

    jobServiceSpy = TestBed.inject(JobPostingService) as jasmine.SpyObj<JobPostingService>;
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppliedJobsListComponent);
    component = fixture.componentInstance;
    
    userServiceSpy.findLoggedUser.and.returnValue(Promise.resolve({ _id: 'test-user-id' }));
    jobServiceSpy.getAllJobsAppliedByUser.and.returnValue(of([]));
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch user data on init', async () => {
    await fixture.whenStable();
    expect(userServiceSpy.findLoggedUser).toHaveBeenCalled();
    expect(jobServiceSpy.getAllJobsAppliedByUser).toHaveBeenCalledWith('test-user-id');
  });

  it('should navigate to job details', () => {
    component.viewJobDetails('test-job-id');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/job', 'test-job-id']);
  });
});
