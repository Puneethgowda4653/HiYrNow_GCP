import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Item } from '../../models/item.model.client';

@Component({
  selector: 'app-main-content',
  templateUrl: './main-content.component.html',
  styleUrls: ['./main-content.component.css'],
})
export class MainContentComponent {
  @Input() items: Item[] = [];
  @Input() isLoading: boolean = false;
  @Input() error: string | null = null;

  @Output() itemSelected = new EventEmitter<Item>();
  @Output() loadMore = new EventEmitter<void>();

  onItemClick(item: Item): void {
    this.itemSelected.emit(item);
  }

  onLoadMore(): void {
    this.loadMore.emit();
  }
}
