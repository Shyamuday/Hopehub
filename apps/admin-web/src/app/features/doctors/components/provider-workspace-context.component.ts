import { Component, input } from '@angular/core';

@Component({
  selector: 'app-provider-workspace-context',
  standalone: true,
  template: `
    <section class="context" [class.context--hope]="workspaceKey() === 'hope-hub'">
      <p>{{ workspaceLabel() }} workspace</p>
      <h1>{{ providerPluralTitle() }}</h1>
      <span>
        @if (workspaceKey() === 'hope-hub') {
          Showing {{ providerPlural() }} only. Provider roles control public psychologist, coach,
          guide, or listener visibility.
        } @else {
          Showing {{ providerPlural() }} only. {{ hopeHubProviderPlural() }} stay in the Hope Hub
          workspace.
        }
      </span>
    </section>
  `,
  styles: `
    .context {
      border: 1px solid #dbeafe;
      border-radius: 14px;
      background: radial-gradient(circle at 100% 0, rgba(37, 99, 235, 0.12), transparent 38%), #fff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
      padding: 1.1rem 1.2rem;
    }
    .context--hope {
      border-color: #ccfbf1;
      background:
        radial-gradient(circle at 100% 0, rgba(20, 184, 166, 0.14), transparent 38%), #fff;
    }
    p,
    h1,
    span {
      margin: 0;
    }
    p {
      color: #2563eb;
      font-size: 0.7rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .context--hope p {
      color: #0f766e;
    }
    h1 {
      margin-top: 0.18rem;
      color: #0f172a;
      font-size: clamp(1.15rem, 3vw, 1.45rem);
    }
    span {
      display: block;
      margin-top: 0.3rem;
      color: #64748b;
      font-size: 0.82rem;
      line-height: 1.45;
    }
  `,
})
export class ProviderWorkspaceContextComponent {
  readonly workspaceKey = input.required<string>();
  readonly workspaceLabel = input.required<string>();
  readonly providerPluralTitle = input.required<string>();
  readonly providerPlural = input.required<string>();
  readonly hopeHubProviderPlural = input.required<string>();
}
