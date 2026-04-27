import { Component, OnInit, OnDestroy } from '@angular/core';
import { PwaService } from '../../services/pwa.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pwa-install-prompt',
  templateUrl: './pwa-install-prompt.component.html',
  styleUrls: ['./pwa-install-prompt.component.css']
})
export class PwaInstallPromptComponent implements OnInit, OnDestroy {
  showPrompt: boolean = false;
  private subscription?: Subscription;

  constructor(private pwaService: PwaService) {}

  ngOnInit(): void {
    this.subscription = this.pwaService.promptEvent$.subscribe(event => {
      this.showPrompt = !!event;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async install(): Promise<void> {
    await this.pwaService.installPwa();
    this.showPrompt = false;
  }

  dismiss(): void {
    this.pwaService.dismissPrompt();
    this.showPrompt = false;
  }
}

