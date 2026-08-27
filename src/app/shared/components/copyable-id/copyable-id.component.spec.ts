import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CopyableIdComponent } from './copyable-id.component';

describe('CopyableIdComponent (Admin PR 2)', () => {
  let fixture: ComponentFixture<CopyableIdComponent>;

  function createComponent(value: string): ComponentFixture<CopyableIdComponent> {
    TestBed.configureTestingModule({ imports: [CopyableIdComponent] });

    const created = TestBed.createComponent(CopyableIdComponent);
    created.componentRef.setInput('value', value);
    created.detectChanges();
    return created;
  }

  it('muestra los primeros 8 caracteres del id truncados con "…"', () => {
    fixture = createComponent('abcd1234-5678-90ab-cdef-1234567890ab');
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('#abcd1234…');
  });

  it('el id completo queda disponible en el title (hover)', () => {
    fixture = createComponent('abcd1234-5678-90ab-cdef-1234567890ab');
    const el = fixture.nativeElement as HTMLElement;
    const valueEl = el.querySelector('.copyable-id__value') as HTMLElement;

    expect(valueEl.title).toBe('abcd1234-5678-90ab-cdef-1234567890ab');
  });

  it('copia el id completo (no el truncado) al portapapeles al hacer click en "Copiar"', async () => {
    fixture = createComponent('abcd1234-5678-90ab-cdef-1234567890ab');
    const writeText = spyOn(navigator.clipboard, 'writeText').and.resolveTo();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith('abcd1234-5678-90ab-cdef-1234567890ab');
  });

  it('muestra "Copiado" brevemente después de copiar, después vuelve a "Copiar"', async () => {
    jasmine.clock().install();
    fixture = createComponent('abcd1234-5678-90ab-cdef-1234567890ab');
    spyOn(navigator.clipboard, 'writeText').and.resolveTo();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button.textContent?.trim()).toBe('Copiado');

    jasmine.clock().tick(1600);
    fixture.detectChanges();

    expect(button.textContent?.trim()).toBe('Copiar');
    jasmine.clock().uninstall();
  });

  it('no rompe si el clipboard rechaza (sin permisos/foco)', async () => {
    fixture = createComponent('abcd1234-5678-90ab-cdef-1234567890ab');
    spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('denied'));

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(() => button.click()).not.toThrow();
    await fixture.whenStable();

    expect(button.textContent?.trim()).toBe('Copiar');
  });
});
