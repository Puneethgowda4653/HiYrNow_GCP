// users-list.component.ts
import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model.client';
import { Router } from '@angular/router';
@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(private usersService: UserService,private router: Router) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    this.loading = true;
    this.usersService.findAllUsers()
      .then((users: User[]) => {
        this.users = users.reverse();
        this.loading = false;
      })
      .catch((err: any) => {
        console.error('Error fetching users', err);
        this.error = 'Failed to load users';
        this.loading = false;
      });
  }
  

  viewUserDetails(user: User): void {
    if (user && user._id) {
      const routeUrl = this.router.serializeUrl(
        this.router.createUrlTree([`/profile-seeker/${user._id}`])
      );
      const absoluteUrl = `${window.location.origin}${routeUrl}`;
      window.open(absoluteUrl, '_blank');
    } else {
      console.error('Invalid user object:', user);
    }
  }
  

  editUser(user: User): void {
    // Implement user edit logic
    console.log('Edit user', user);
  }
}