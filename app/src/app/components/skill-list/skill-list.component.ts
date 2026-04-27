import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { SkillService } from '../../services/skill.service';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { getAllSkills } from 'src/app/constants/skills.constants';
import { trigger, transition, style, animate } from '@angular/animations';

interface Skill {
  _id: string;
  skillName: string;
  skillLevel: number;
  category?: string; // Optional category for grouping skills
}

@Component({
  selector: 'app-skill-list',
  templateUrl: './skill-list.component.html',
  styleUrls: ['./skill-list.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('400ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class SkillListComponent implements OnInit {
  skillForm!: FormGroup;
  user: any;
  skills: Skill[] = [];
  addMode = false;
  isEditMode = false;
  updateId = '';
  skillLevels = Array.from({length: 10}, (_, i) => i + 1);
  loading = false;
  filteredSkills: string[] = [];
  showSuggestions = false;
  searchTerm = '';
  skillCategories: string[] = ['Development', 'Design', 'Marketing', 'Management', 'Other'];
  selectedCategory = '';

  readonly commonSkills = getAllSkills();
  maxSkills = 20;
  @Output() dataChanged = new EventEmitter<void>()
  // Skill level descriptions for tooltip
  skillLevelDescriptions = [
    'Beginner',
    'Basic knowledge',
    'Comfortable with basics',
    'Practical application',
    'Advanced knowledge',
    'Professional level',
    'Expert',
    'Specialist',
    'Authority',
    'Master'
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private skillService: SkillService,
    private toastr: ToastrService
  ) {
    this.initializeForm();
    this.setupSkillNameSubscription();
  }

  private initializeForm() {
    this.skillForm = this.fb.group({
      skillName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      skillLevel: ['', Validators.required],
      category: ['Other'] // Default category
    });
  }

  private setupSkillNameSubscription() {
    this.skillForm.get('skillName')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(value => {
        if (value?.length >= 2) {
          this.filterSkills(value);
          this.showSuggestions = true;
        } else {
          this.showSuggestions = false;
        }
      });
  }

  private filterSkills(value: string) {
    const filterValue = value.toLowerCase();
    // Filter from common skills and exclude already added skills
    const existingSkillNames = this.skills.map(s => s.skillName.toLowerCase());
    this.filteredSkills = this.commonSkills
      .filter(skill => 
        skill.toLowerCase().includes(filterValue) && 
        !existingSkillNames.includes(skill.toLowerCase())
      )
      .slice(0, 5); // Limit to top 5 suggestions
  }

  selectSkill(skill: string) {
    this.skillForm.patchValue({ skillName: skill });
    this.showSuggestions = false;
  }

  get canAddSkill(): boolean {
    return this.skills.length < this.maxSkills;
  }

  get skillsRemaining(): number {
    return this.maxSkills - this.skills.length;
  }

  get formControls() {
    return this.skillForm.controls;
  }

  isSkillAlreadyAdded(skillName: string): boolean {
    return this.skills.some(s => 
      s.skillName.toLowerCase() === skillName.toLowerCase()
    );
  }

  getSkillLevelDescription(level: number): string {
    return this.skillLevelDescriptions[level - 1];
  }

  getSkillsByCategory(category: string): Skill[] {
    if (!category) return this.skills;
    return this.skills.filter(skill => skill.category === category);
  }

  async add() {
    this.skillForm.reset({category: 'Other'});
    this.addMode = true;
  }

  async create() {
    if (this.skillForm.invalid) {
      this.markFormGroupTouched(this.skillForm);
      return;
    }

    const skillName = this.skillForm.get('skillName')?.value;
    if (this.isSkillAlreadyAdded(skillName)) {
      this.toastr.error('This skill is already in your list', '', {
        progressBar: true,
        positionClass: 'toast-bottom-right'
      });
      return;
    }

    try {
      this.loading = true;
      const newSkill = this.skillForm.value;
      const response = await this.skillService.createSkill(newSkill);
      this.skills.push(response);
      this.toastr.success('Skill added successfully', '', {
        progressBar: true,
        positionClass: 'toast-bottom-right'
      });
      this.addMode = false;
    } catch (error) {
      this.toastr.error('Failed to add skill', '', {
        progressBar: true,
        positionClass: 'toast-bottom-right'
      });
    } finally {
      this.loading = false;
    }
  }

  async edit(skill: any, id: string) {
    this.isEditMode = true;
    this.updateId = id;
    this.skillForm.patchValue({
      skillName: skill.skillName,
      skillLevel: skill.skillLevel,
      category: skill.category || 'Other'
    });
  }

  async update() {
    if (this.skillForm.invalid) {
      this.markFormGroupTouched(this.skillForm);
      return;
    }

    try {
      this.loading = true;
      const updatedSkill = this.skillForm.value;
      await this.skillService.updateSkill(this.updateId, updatedSkill);
      const updatedSkills = await this.skillService.findSkillByUserId();
      this.dataChanged.emit();
      this.skills = updatedSkills;
      this.toastr.success('Skill updated successfully', '', {
        progressBar: true,
        positionClass: 'toast-bottom-right'
      });
      this.cancelEdit();
    } catch (error) {
      this.toastr.error('Failed to update skill', '', {
        progressBar: true,
        positionClass: 'toast-bottom-right'
      });
    } finally {
      this.loading = false;
    }
  }

  async delete(id: string) {
    try {
      this.loading = true;
      await this.skillService.deleteSkill(id);
      this.dataChanged.emit();
      this.skills = this.skills.filter(skill => skill._id !== id);
      this.toastr.success('Skill deleted successfully', '', {
        progressBar: true,
        positionClass: 'toast-bottom-right'
      });
    } catch (error) {
      this.toastr.error('Failed to delete skill', '', {
        progressBar: true,
        positionClass: 'toast-bottom-right'
      });
    } finally {
      this.loading = false;
    }
  }

  cancelAdd() {
    this.addMode = false;
    this.skillForm.reset();
  }

  cancelEdit() {
    this.isEditMode = false;
    this.updateId = '';
    this.skillForm.reset();
  }

  getStars(level: number): number[] {
    return Array(5).fill(0).map((x, i) => i < Math.ceil(level / 2) ? 1 : 0);
  }

  filterBySearch(skills: Skill[]): Skill[] {
    if (!this.searchTerm) return skills;
    return skills.filter(skill => 
      skill.skillName.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  async ngOnInit() {
    try {
      this.loading = true;
      const user = await this.userService.findLoggedUser();
      this.user = user;
      if (user) {
        this.skills = await this.skillService.findSkillByUserId();
        this.dataChanged.emit();
      }
    } catch (error) {
      this.toastr.error('Failed to load skills', '', {
        progressBar: true,
        positionClass: 'toast-bottom-right'
      });
    } finally {
      this.loading = false;
    }
  }
}