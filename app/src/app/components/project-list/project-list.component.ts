import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { UserService } from '../../services/user.service';
import { ProjectService } from '../../services/project.service';

import { ToastrService } from 'ngx-toastr';

interface Project {
  _id: string;
  projectName: string;
  description: string;
  startDate: { month: string; year: string };
  endDate: { month: string; year: string };
  ongoingStatus: string;
  collaborators: string[];
  url: string;
  associatedWith: string;
  skillsUsed: string[];
}


@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css'],
})
export class ProjectListComponent implements OnInit {
  projectForm!: FormGroup;
  addMode = false;
  editMode = false;
  projects: Project[] = [];
  updateId = '';
  isLoading: boolean = false;
  editorConfig = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['blockquote', 'code-block'],
      [{ header: [1, 2, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean'],
    ],
  };

  @Output() dataChanged = new EventEmitter<void>();
pendingDeleteId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private projectService: ProjectService,
    private toastr: ToastrService
  ) {
    this.initForm();
  }

  private initForm(project?: Partial<Project>) {
    this.projectForm = this.fb.group({
      projectName: [
        project?.projectName || '',
        [Validators.required, Validators.minLength(3)],
      ],
      description: [project?.description || '', Validators.required],
      ongoingStatus: [project?.ongoingStatus || 'true', Validators.required],
      collaborators: [
        project?.collaborators?.join(', ') || '',
        Validators.required,
      ],
      url: [project?.url || '', [Validators.pattern('https?://.+')]],
      associatedWith: [project?.associatedWith || '', Validators.required],
      skillsUsed: [project?.skillsUsed?.join(', ') || '', Validators.required],
    });
  }

  edit(project: Project) {
    if (project._id) {
      this.updateId = project._id;
      this.initForm({
        ...project,
        collaborators: Array.isArray(project.collaborators)
          ? project.collaborators
          : [project.collaborators],
        skillsUsed: Array.isArray(project.skillsUsed)
          ? project.skillsUsed
          : [project.skillsUsed],
      });
      this.editMode = true;
    }
  }

  add() {
    this.initForm();
    this.addMode = true;
  }
  cancelAdd() {
    this.addMode = false;
    this.editMode = false;
  }
  async create() {
    if (this.projectForm.invalid) return;

    const formValue = this.projectForm.value;
    const newProject = {
      ...formValue,
      collaborators: formValue.collaborators
        .split(',')
        .map((s: string) => s.trim()),
      skillsUsed: formValue.skillsUsed.split(',').map((s: string) => s.trim()),
    };

    await this.projectService.createProject(newProject);
    await this.refreshProjects();
    this.dataChanged.emit();
    this.addMode = false;
  }

  async delete(id: string) {
  if (this.pendingDeleteId === id) {
    this.pendingDeleteId = null;
    try {
      await this.projectService.deleteProject(id);
      await this.refreshProjects();
      this.dataChanged.emit();
      this.toastr.success('Project deleted successfully');
    } catch (error) {
      this.toastr.error('Failed to delete project. Please try again.');
    }
  } else {
    this.pendingDeleteId = id;
    this.toastr.warning('Click delete again to confirm', 'Are you sure?');
    setTimeout(() => {
      if (this.pendingDeleteId === id) this.pendingDeleteId = null;
    }, 4000);
  }
}

  async update() {
    if (this.projectForm.invalid) return;
    console.log('update ');
    const formValue = this.projectForm.value;
    const updatedProject = {
      ...formValue,
      collaborators: formValue.collaborators
        .split(',')
        .map((s: string) => s.trim()),
      skillsUsed: formValue.skillsUsed.split(',').map((s: string) => s.trim()),
    };

    await this.projectService.updateProject(this.updateId, updatedProject);
    await this.refreshProjects();
    this.dataChanged.emit();
    this.editMode = false;
  }

  private async refreshProjects() {
    this.projects = await this.projectService.findProjectByUserId();
  }

  getErrorMessage(controlName: string): string {
    const control = this.projectForm.get(controlName);
    if (!control || !control.errors) return '';

    const errors: { [key: string]: string } = {
      required: 'This field is required',
      minlength: 'Minimum length is 3 characters',
      pattern: 'Please enter a valid URL',
    };

    const firstError = Object.keys(control.errors)[0];
    return errors[firstError] || 'Invalid input';
  }
  cancelEdit() {
    this.editMode = false;
  }
  ngOnInit() {
    this.userService.findLoggedUser().then((user) => {
      if (user) this.refreshProjects();
    });
  }
}
