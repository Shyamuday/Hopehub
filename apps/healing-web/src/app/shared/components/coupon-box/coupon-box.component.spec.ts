import { CouponBoxComponent } from './coupon-box.component';

describe('CouponBoxComponent', () => {
  it('applies the coupon without submitting the surrounding form when Enter is pressed', () => {
    const component = new CouponBoxComponent();
    const apply = vi.spyOn(component.apply, 'emit');
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as Event;
    component.value = 'FIRSTTALK1';

    component.applyFromKeyboard(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledOnce();
  });

  it('still blocks parent form submission while coupon validation is running', () => {
    const component = new CouponBoxComponent();
    const apply = vi.spyOn(component.apply, 'emit');
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as Event;
    component.value = 'FIRSTTALK1';
    component.loading = true;

    component.applyFromKeyboard(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(apply).not.toHaveBeenCalled();
  });

  it('emits the suggested coupon for one-tap apply', () => {
    const component = new CouponBoxComponent();
    const suggestedApply = vi.spyOn(component.suggestedApply, 'emit');
    component.suggestedCode = 'firsttalk1';

    component.useSuggestedCoupon();

    expect(suggestedApply).toHaveBeenCalledWith('FIRSTTALK1');
  });
});
