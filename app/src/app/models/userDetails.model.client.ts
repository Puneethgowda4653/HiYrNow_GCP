export interface userDetails {
    user?: {
      firstName: string;
      lastName: string;
      tagline?: string;
      role?: string;
      email?: string;
      phone?: string;
      gender?: string;
      dateOfBirth?: Date;
      socialContact?: { socialtype: string, url: string }[];
      preferredJobs?: string[];
      preferredJobType?: string;
      preferredCTC?: number;
      currentLocation?: string;
      currentState?: string;
      currentCountry?: string;
      preferredLocation?: string;
      preferredCountry?: string;
      currentCTC?: number;
      noticePeriod?: string;
      maritalStatus?: string;
    };
    
    experiences?: {
      title: string;
      company: string;
      location: string;
      startDate: { month: string, year: number };
      endDate: { month: string, year: number };
      description?: string;
      project?: string;
      stacks?: string[];
    }[];
    
    education?: {
      degree: string;
      fieldOfStudy: string;
      institute: string;
      location: string;
      startDate: { month: string, year: number };
      endDate: { month: string, year: number };
      grade?: string;
      url?: string;
      description?: string;
    }[];
    
    skill?: {
      skillName: string;
      skillLevel: string;
    }[];
    
    project?: {
      projectName: string;
      description: string;
      url?: string;
      ongoingStatus?: string;
      associatedWith?: string;
      collaborators?: string[];
      skillsUsed?: string[];
    }[];
    
    resume?: any[];  // Adjust the type based on the structure of resume data
  }
  