import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminBlogComponent } from './admin-blog.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BlogService } from '../../services/blog.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

describe('AdminBlogComponent', () => {
  let component: AdminBlogComponent;
  let fixture: ComponentFixture<AdminBlogComponent>;
  let blogServiceSpy: jasmine.SpyObj<BlogService>;
  let toastrServiceSpy: jasmine.SpyObj<ToastrService>;

  beforeEach(async () => {
    const blogSpy = jasmine.createSpyObj('BlogService', ['getAllBlogs', 'createBlog', 'updateBlog', 'deleteBlog']);
    const toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    await TestBed.configureTestingModule({
      declarations: [ AdminBlogComponent ],
      imports: [ ReactiveFormsModule ],
      providers: [
        FormBuilder,
        { provide: BlogService, useValue: blogSpy },
        { provide: ToastrService, useValue: toastrSpy }
      ]
    }).compileComponents();

    blogServiceSpy = TestBed.inject(BlogService) as jasmine.SpyObj<BlogService>;
    toastrServiceSpy = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminBlogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.blogForm.get('title')?.value).toBe('');
    expect(component.blogForm.get('content')?.value).toBe('');
  });

  it('should validate required fields', () => {
    const form = component.blogForm;
    expect(form.valid).toBeFalsy();
    
    form.controls['title'].setValue('Test Title');
    form.controls['content'].setValue('Test Content');
    form.controls['excerpt'].setValue('Test Excerpt');
    
    expect(form.valid).toBeTruthy();
  });

  it('should create new blog post', () => {
    const mockBlog = {
      title: 'Test Blog',
      content: 'Test Content',
      excerpt: 'Test Excerpt'
    };

    blogServiceSpy.createBlog.and.returnValue(of({}));
    
    component.blogForm.patchValue(mockBlog);
    component.onSubmit();

    expect(blogServiceSpy.createBlog).toHaveBeenCalledWith(mockBlog);
    expect(toastrServiceSpy.success).toHaveBeenCalled();
  });
});
