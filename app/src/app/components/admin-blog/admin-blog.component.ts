import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BlogService } from '../../services/blog.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-blog',
  templateUrl: './admin-blog.component.html',
  styleUrls: ['./admin-blog.component.css']
})
export class AdminBlogComponent implements OnInit {
  blogForm: FormGroup;
  blogs: any[] = [];
  isEditing: boolean = false;
  selectedBlog: any = null;
  quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline'],        // toggled buttons
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],     // custom button values
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
      ['clean'],   ['link'],                             // remove formatting button
    ]
  };

  constructor(
    private fb: FormBuilder,
    private blogService: BlogService,
    private toastr: ToastrService
  ) {
    this.blogForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
      excerpt: ['', Validators.required],
      image: [''],
      tags: ['']
    });
  }

  ngOnInit(): void {
    this.loadBlogs();
  }

  loadBlogs(): void {
    this.blogService.getAllBlogs().subscribe(
      (data) => {
        this.blogs = data;
      },
      (error) => {
        this.toastr.error('Failed to load blogs');
      }
    );
  }

  onSubmit(): void {
    if (this.blogForm.valid) {
      const blogData = this.blogForm.value;
      
      if (this.isEditing) {
        this.blogService.updateBlog(this.selectedBlog._id, blogData).subscribe(
          () => {
            this.toastr.success('Blog updated successfully');
            this.resetForm();
            this.loadBlogs();
          },
          (error) => {
            this.toastr.error('Failed to update blog');
          }
        );
      } else {
        this.blogService.createBlog(blogData).subscribe(
          () => {
            this.toastr.success('Blog created successfully');
            this.resetForm();
            this.loadBlogs();
          },
          (error) => {
            this.toastr.error('Failed to create blog');
          }
        );
      }
    }
  }

  editBlog(blog: any): void {
    this.isEditing = true;
    this.selectedBlog = blog;
    this.blogForm.patchValue(blog);
  }

  deleteBlog(id: string): void {
    if (confirm('Are you sure you want to delete this blog?')) {
      this.blogService.deleteBlog(id).subscribe(
        () => {
          this.toastr.success('Blog deleted successfully');
          this.loadBlogs();
        },
        (error) => {
          this.toastr.error('Failed to delete blog');
        }
      );
    }
  }

  resetForm(): void {
    this.blogForm.reset();
    this.isEditing = false;
    this.selectedBlog = null;
  }
}
