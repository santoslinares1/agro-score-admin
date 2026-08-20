import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  let fixture: ComponentFixture<AdminLayoutComponent>;

  beforeEach(() => {
    const authServiceStub = {
      currentUser: null,
      logout: jasmine.createSpy('logout'),
    } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceStub }],
    });

    fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function toggleButton(): HTMLButtonElement {
    return root().querySelector('.sidebar-toggle') as HTMLButtonElement;
  }

  function sidebar(): HTMLElement {
    return root().querySelector('.sidebar') as HTMLElement;
  }

  it('renders the nav links and starts with the mobile sidebar closed', () => {
    expect(sidebar().classList).not.toContain('sidebar--open');
    expect(toggleButton().getAttribute('aria-expanded')).toBe('false');
    expect(root().querySelectorAll('.sidebar__nav a').length).toBeGreaterThan(0);
  });

  it('opens the sidebar (with backdrop) on the hamburger button and closes it again on a second click', () => {
    toggleButton().click();
    fixture.detectChanges();

    expect(sidebar().classList).toContain('sidebar--open');
    expect(root().querySelector('.sidebar-backdrop')).not.toBeNull();

    toggleButton().click();
    fixture.detectChanges();

    expect(sidebar().classList).not.toContain('sidebar--open');
  });

  it('closes the sidebar when a nav link is clicked', () => {
    toggleButton().click();
    fixture.detectChanges();
    expect(sidebar().classList).toContain('sidebar--open');

    const firstNavLink = sidebar().querySelector<HTMLAnchorElement>('.sidebar__nav a');
    firstNavLink?.click();
    fixture.detectChanges();

    expect(sidebar().classList).not.toContain('sidebar--open');
  });

  it('closes the sidebar when the backdrop is clicked', () => {
    toggleButton().click();
    fixture.detectChanges();

    const backdrop = root().querySelector<HTMLElement>('.sidebar-backdrop');
    backdrop?.click();
    fixture.detectChanges();

    expect(sidebar().classList).not.toContain('sidebar--open');
  });
});
