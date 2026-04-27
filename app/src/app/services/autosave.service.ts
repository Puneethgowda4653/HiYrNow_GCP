import { Injectable } from '@angular/core';
// ✅ AFTER
import { Observable, Subject, BehaviorSubject, timer, Subscription, from } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface AutosaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasError: boolean;
  errorMessage: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AutosaveService {
  private autosaveStates = new Map<string, BehaviorSubject<AutosaveState>>();
  private saveTriggers = new Map<string, Subject<any>>();
  private subscriptions = new Map<string, Subscription>();
  private saveCallbacks = new Map<string, (data: any) => Promise<any>>();

  /**
   * Register a form/component for autosave
   * @param id Unique identifier for the form/component
   * @param saveCallback Function to call when saving
   * @param debounceMs Debounce time in milliseconds (default: 500ms for input, 5000ms for timer)
   */
  register<T>(
    id: string,
    saveCallback: (data: T) => Promise<any>,
    debounceMs: number = 500
  ): Observable<AutosaveState> {
    // Initialize state
    if (!this.autosaveStates.has(id)) {
      this.autosaveStates.set(id, new BehaviorSubject<AutosaveState>({
        isSaving: false,
        lastSaved: null,
        hasError: false,
        errorMessage: null
      }));
    }

    // Initialize save trigger
    if (!this.saveTriggers.has(id)) {
      this.saveTriggers.set(id, new Subject<T>());
    }

    // Store save callback
    this.saveCallbacks.set(id, saveCallback as (data: any) => Promise<any>);

    // Set up autosave pipeline
    const trigger = this.saveTriggers.get(id)!;
    const state = this.autosaveStates.get(id)!;

    // Cancel existing subscription if any
    if (this.subscriptions.has(id)) {
      this.subscriptions.get(id)?.unsubscribe();
    }

    const subscription = trigger.pipe(
      debounceTime(debounceMs),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      tap(() => {
        state.next({
          ...state.value,
          isSaving: true,
          hasError: false,
          errorMessage: null
        });
      }),
      // ✅ AFTER
      switchMap((data: T) =>
        from(this.saveCallbacks.get(id)!(data)).pipe(
          tap(() => state.next({
            isSaving: false,
            lastSaved: new Date(),
            hasError: false,
            errorMessage: null
          })),
          catchError((error) => {
            state.next({
              isSaving: false,
              lastSaved: state.value.lastSaved,
              hasError: true,
              errorMessage: error?.message || 'Failed to save'
            });
            return of(false);
          })
        )
      ),
      catchError((error) => {
        state.next({
          isSaving: false,
          lastSaved: state.value.lastSaved,
          hasError: true,
          errorMessage: error?.message || 'Failed to save'
        });
        return of(false);
      })
    ).subscribe();

    this.subscriptions.set(id, subscription);

    return state.asObservable();
  }

  /**
   * Trigger autosave for a registered form/component
   */
  triggerSave<T>(id: string, data: T): void {
    const trigger = this.saveTriggers.get(id);
    if (trigger) {
      trigger.next(data);
    }
  }

  /**
   * Get current autosave state
   */
  getState(id: string): AutosaveState | null {
    return this.autosaveStates.get(id)?.value || null;
  }

  /**
   * Get autosave state observable
   */
  getState$(id: string): Observable<AutosaveState> | null {
    return this.autosaveStates.get(id)?.asObservable() || null;
  }

  /**
   * Manually save (bypass debounce)
   */
  async manualSave<T>(id: string, data: T): Promise<boolean> {
    const callback = this.saveCallbacks.get(id);
    const state = this.autosaveStates.get(id);

    if (!callback || !state) {
      return false;
    }

    state.next({
      ...state.value,
      isSaving: true,
      hasError: false,
      errorMessage: null
    });

    try {
      await callback(data);
      state.next({
        isSaving: false,
        lastSaved: new Date(),
        hasError: false,
        errorMessage: null
      });
      return true;
    } catch (error: any) {
      state.next({
        isSaving: false,
        lastSaved: state.value.lastSaved,
        hasError: true,
        errorMessage: error?.message || 'Failed to save'
      });
      return false;
    }
  }

  /**
   * Start periodic autosave (every 5 seconds)
   */
  startPeriodicSave<T>(id: string, getData: () => T, intervalMs: number = 5000): Subscription {
    return timer(0, intervalMs).subscribe(() => {
      const data = getData();
      if (data) {
        this.triggerSave(id, data);
      }
    });
  }

  /**
   * Unregister a form/component
   */
  unregister(id: string): void {
    this.subscriptions.get(id)?.unsubscribe();
    this.subscriptions.delete(id);
    this.saveTriggers.delete(id);
    this.autosaveStates.delete(id);
    this.saveCallbacks.delete(id);
  }

  /**
   * Clear all registrations (useful for cleanup)
   */
  clearAll(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
    this.saveTriggers.clear();
    this.autosaveStates.clear();
    this.saveCallbacks.clear();
  }
}

