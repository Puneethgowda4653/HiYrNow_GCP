import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { RecruiterDetailService } from '../../services/recruiter-detail.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-company-public-profile',
  templateUrl: './company-public-profile.component.html',
  styleUrl: './company-public-profile.component.css'
})
export class CompanyPublicProfileComponent {
  user: any;
  recruiter: any;
  updateId = '';
  updateCompanyId = '';
  username = '';
  password = '';
  firstName = '';
  lastName = '';
  title = '';
  company = '';
  companyName = '';
  companyWebsite = '';
  industry = '';
  location = '';
  aboutCompany = '';
  companyMission = '';
  coreValues = '';
  employeeBenefits = '';
  numberOfEmployees: number | undefined;
  yearEstablished: number | undefined;
  email = '';
  requestStatus = '';
  phone = '';
  facebook = '';
  linkedin = '';
  github = '';
  twitter = '';
  socialContact: any[] = [];
  editMode = false;
  profilePicUrl!: string;
  profilePicExist = false;
  activeTab = 'about';
  tabs = [
    { id: 'about', name: 'About' },
    { id: 'products', name: 'Products & Services' },
    { id: 'careers', name: 'Careers' },
    { id: 'people', name: 'People' },
    { id: 'contact', name: 'Contact' }
  ];

  // New fields
  productsServices: string[] = [];
  teamMembers: any[] = [];

  constructor(
    private route: ActivatedRoute,

    private userService: UserService,
    private recruiterService: RecruiterDetailService
  ) {}

  edit() {
    this.editMode = true;
  }

  cancel() {
    this.editMode = false;
  }

  // update() {
  //   const social = [
  //     { 'socialtype': 'github', 'url': this.github },
  //     { 'socialtype': 'linkedin', 'url': this.linkedin },
  //     { 'socialtype': 'facebook', 'url': this.facebook },
  //     { 'socialtype': 'twitter', 'url': this.twitter }
  //   ];
  //   const updatedUser = {
  //     'username': this.username,
  //     'firstName': this.firstName,
  //     'lastName': this.lastName,
  //     'email': this.email,
  //     'phone': this.phone,
  //     'socialContact': social
  //   };
  //   const company = {
  //     'title': this.title,
  //     'company': this.company,
  //     'companyName': this.companyName,
  //     'companyWebsite': this.companyWebsite,
  //     'industry': this.industry,
  //     'location': this.location,
  //     'aboutCompany': this.aboutCompany,
  //     'numberOfEmployees': this.numberOfEmployees,
  //     'yearEstablished': this.yearEstablished,
  //     'companyMission': this.companyMission,
  //     'coreValues': this.coreValues,
  //     'employeeBenefits': this.employeeBenefits,
  //     'productsServices': this.productsServices,
  //     'teamMembers': this.teamMembers
  //   };

  //   this.editMode = false;
  //   this.userService.updateUserProfile(updatedUser)
  //     .then((updatedUser) => {
  //       this.recruiterService.updateRecruiterDetail(this.updateCompanyId, company)
  //         .then((updatedRecruiter) => {
  //           console.log('Update success');
  //         });
  //     });
  // }

  checkHidden(url: string) {
    return url === '';
  }

  loadProfilePic(userId: string): void {
    this.userService.getProfilePic(userId).subscribe(
      (data: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.profilePicUrl = reader.result as string;
          this.profilePicExist = true;
        };
        reader.readAsDataURL(data);
      },
      (error) => {
        console.error('Error fetching profile picture:', error);
        this.setDefaultProfilePic();
      }
    );
  }
  
  setDefaultProfilePic(): void {
    this.profilePicUrl = 'assets/defaultLogo.png';
    this.profilePicExist = false;
  }

  addProductService() {
    this.productsServices.push('');
  }

  removeProductService(index: number) {
    this.productsServices.splice(index, 1);
  }

  addTeamMember() {
    this.teamMembers.push({ name: '', position: '' });
  }

  removeTeamMember(index: number) {
    this.teamMembers.splice(index, 1);
  }
  
  ngOnInit() {
    this.route.params.subscribe((params) => {
      const user = params['id']; 
        if (user !== null) {
          this.loadProfilePic(user._id);
          this.updateId = user._id;
          this.username = user.username;
          this.password = user.password;
          this.firstName = user.firstName;
          this.lastName = user.lastName;
          this.email = user.email;
          this.phone = user.phone;
          this.requestStatus = user.requestStatus;
          if (user.socialContact.length !== 0) {
            this.socialContact = user.socialContact;
            this.facebook = this.socialContact.find((s: { socialtype: string; }) => s.socialtype === 'facebook')?.url || '';
            this.github = this.socialContact.find((s: { socialtype: string; }) => s.socialtype === 'github')?.url || '';
            this.linkedin = this.socialContact.find((s: { socialtype: string; }) => s.socialtype === 'linkedin')?.url || '';
            this.twitter = this.socialContact.find((s: { socialtype: string; }) => s.socialtype === 'twitter')?.url || '';
          }
          this.recruiterService.findRecruiterDetailsByUserId()
            .then((company) => {
              this.updateCompanyId = company._id;
              this.title = company.title ?? '';
              this.company = company.company ?? '';
              this.companyName = company.companyName ?? '';
              this.companyWebsite = company.companyWebsite ?? '';
              this.industry = company.industry ?? '';
              this.location = company.location ?? '';
              this.aboutCompany = company.aboutCompany ?? '';
              this.numberOfEmployees = company.numberOfEmployees;
              this.yearEstablished = company.yearEstablished;
              this.companyMission = company.companyMission ?? '';
              this.coreValues = company.coreValues ?? '';
              this.employeeBenefits = company.employeeBenefits ?? '';
              this.productsServices = company.productsServices ?? [];
              this.teamMembers = company.teamMembers ?? [];
            });
        } else {
          console.log('User: null');
        }
      });
  }
}
