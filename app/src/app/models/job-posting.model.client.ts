export class JobPostingModelClient {
  _id!: string;
  id!: string;
  title!: string;
  created_at!: string;
  location!: string;
  type!: string;
  description!: string;
  skillsRequired!: string[];
  company!: string;
  responsibilities!: string;
  company_logo!: string;
  jobSource!: string;
  datePosted!: Date;
  minQualification!: string;
  date!: string;
  how_to_apply!: string;
  company_url!: string;
  minSalary!: number;
  maxSalary!: number;
  minExp!: number;
  maxExp!: number;
  status!: string;
  user!: string;
  coreSkills = [
    { name: '', mustHave: false, niceToHave: false },
    { name: '', mustHave: false, niceToHave: false },
    { name: '', mustHave: false, niceToHave: false },
    { name: '', mustHave: false, niceToHave: false },
    { name: '', mustHave: false, niceToHave: false },
  ];
  workType!: string;
  postedDate!: string | number | Date;
  totalApplications!: number;
  customQuestions: any;
}
