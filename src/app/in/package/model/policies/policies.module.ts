import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertyDomainModule } from 'src/app/_components/property-domain-component/property-domain.module';

import { SharedLibModule, CustomDateAdapter } from 'sb-shared-lib';
import { WorkbenchModule } from 'src/app/_modules/workbench.module';
import { PackageModelPoliciesComponent } from './package-model-policies.component';
import { PoliciesRoutingModule } from './policies-routing.module';
import { ClassicLayoutModule } from 'src/app/in/classic-layout/classic-layout.module';
import { PolicyEditorDetailComponent } from './_components/policy-editor-detail/policy-editor-detail.component';


@NgModule({
    declarations: [
        PackageModelPoliciesComponent,
        PolicyEditorDetailComponent
    ],
    imports: [
        CommonModule,
        SharedLibModule,
        WorkbenchModule,
        ClassicLayoutModule,
        PropertyDomainModule,
        PoliciesRoutingModule,
    ],
})
export class PackageModelPoliciesModule { }
