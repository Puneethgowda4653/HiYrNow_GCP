import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  loading = false;
  users: any[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  filters: any = { email: '', role: '', status: '' };

  constructor(private admin: AdminService) {}

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.admin.getUsers({ ...this.filters, page: this.page, pageSize: this.pageSize }).subscribe({
      next: (res) => { this.users = res.items; this.total = res.total; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  setStatus(u: any, status: string) {
    this.admin.updateUserStatus(u._id, status).subscribe(() => this.load());
  }
}


