import { describe, expect, it } from 'vitest';
// The iOS localization wiring lives in a build-time ESM module (.mjs); import the
// pure `mutatePbxproj` directly so the same code that runs on the Mac is tested.
// @ts-expect-error — untyped .mjs build script
import { mutatePbxproj } from '../scripts/native/ios-localize.mjs';

type Dict = Record<string, unknown>;
interface Pbxproj {
  rootObject: string;
  objects: Record<string, Dict>;
}

// Deterministic UUID generator so assertions are reproducible.
function makeUuidFn(): () => string {
  let n = 0;
  return () => `DEADBEEF${String(++n).padStart(16, '0')}`;
}

// A minimal Capacitor-style project.pbxproj graph (classic PBXGroup layout).
function classicProject(): Pbxproj {
  return {
    rootObject: 'PROJ0001',
    objects: {
      PROJ0001: { isa: 'PBXProject', knownRegions: ['en', 'Base'], targets: ['TARG0001'] },
      TARG0001: {
        isa: 'PBXNativeTarget',
        name: 'App',
        buildPhases: ['SRCS0001', 'RSRC0001', 'FRMW0001'],
      },
      SRCS0001: { isa: 'PBXSourcesBuildPhase', files: [] },
      RSRC0001: { isa: 'PBXResourcesBuildPhase', files: ['BFXCASSET'] },
      FRMW0001: { isa: 'PBXFrameworksBuildPhase', files: [] },
      BFXCASSET: { isa: 'PBXBuildFile', fileRef: 'FRASSETS0' },
      GRPMAIN0: { isa: 'PBXGroup', children: ['GRPAPP001'], sourceTree: '<group>' },
      GRPAPP001: {
        isa: 'PBXGroup',
        path: 'App',
        sourceTree: '<group>',
        children: ['FRDELEGAT', 'FRASSETS0', 'FRINFO001'],
      },
      FRDELEGAT: { isa: 'PBXFileReference', path: 'AppDelegate.swift', sourceTree: '<group>' },
      FRASSETS0: { isa: 'PBXFileReference', path: 'Assets.xcassets', sourceTree: '<group>' },
      FRINFO001: { isa: 'PBXFileReference', path: 'Info.plist', sourceTree: '<group>' },
    },
  };
}

const asList = (v: unknown): string[] => v as string[];
const variantGroups = (p: Pbxproj): Dict[] =>
  Object.values(p.objects).filter(
    (o) => o.isa === 'PBXVariantGroup' && o.name === 'InfoPlist.strings',
  );

describe('mutatePbxproj', () => {
  it('wires a classic-group project: knownRegions, variant group, resources link', () => {
    const p = classicProject();
    const s = mutatePbxproj(p, makeUuidFn());
    const objs = p.objects;

    expect(s.mode).toBe('classic');
    expect(s.variantGroupCreated).toBe(true);
    expect(s.knownRegionsAdded).toEqual(['ar']);
    expect(objs.PROJ0001.knownRegions).toEqual(expect.arrayContaining(['en', 'Base', 'ar']));

    const vgs = variantGroups(p);
    expect(vgs).toHaveLength(1);
    const vg = vgs[0];
    expect(vg.sourceTree).toBe('<group>');

    const children = asList(vg.children).map((c) => objs[c]);
    const en = children.find((c) => c.name === 'en');
    const ar = children.find((c) => c.name === 'ar');
    expect(en?.path).toBe('en.lproj/InfoPlist.strings');
    expect(ar?.path).toBe('ar.lproj/InfoPlist.strings');
    expect(en?.lastKnownFileType).toBe('text.plist.strings');
    expect(ar?.lastKnownFileType).toBe('text.plist.strings');

    // Linked into the App group and the resources phase, without clobbering the
    // existing xcassets resource.
    const vgUuid = Object.keys(objs).find((k) => objs[k] === vg);
    expect(asList(objs.GRPAPP001.children)).toContain(vgUuid);
    expect(asList(objs.RSRC0001.files)).toContain('BFXCASSET');
    const linked = asList(objs.RSRC0001.files).some((bf) => objs[bf]?.fileRef === vgUuid);
    expect(linked).toBe(true);
  });

  it('is idempotent: a second run adds nothing', () => {
    const p = classicProject();
    mutatePbxproj(p, makeUuidFn());
    const filesAfterFirst = asList(p.objects.RSRC0001.files).length;

    const s2 = mutatePbxproj(p, makeUuidFn());
    expect(s2.variantGroupCreated).toBe(false);
    expect(s2.knownRegionsAdded).toEqual([]);
    expect(variantGroups(p)).toHaveLength(1);
    expect(asList(p.objects.RSRC0001.files).length).toBe(filesAfterFirst);
    expect(asList(p.objects.PROJ0001.knownRegions).filter((r) => r === 'ar')).toHaveLength(1);
  });

  it('skips the variant group for Xcode-16 synchronized folder projects', () => {
    const p = classicProject();
    delete p.objects.GRPAPP001;
    p.objects.SYNCAPP01 = {
      isa: 'PBXFileSystemSynchronizedRootGroup',
      path: 'App',
      sourceTree: '<group>',
    };
    p.objects.GRPMAIN0.children = ['SYNCAPP01'];

    const s = mutatePbxproj(p, makeUuidFn());
    expect(s.mode).toBe('synchronized');
    expect(s.variantGroupCreated).toBe(false);
    // knownRegions is still updated so iOS treats the bundle as Arabic-capable.
    expect(asList(p.objects.PROJ0001.knownRegions)).toContain('ar');
    expect(variantGroups(p)).toHaveLength(0);
  });

  it('completes a pre-existing en-only variant group without duplicating it', () => {
    const p = classicProject();
    p.objects.FRENONLY0 = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'text.plist.strings',
      name: 'en',
      path: 'en.lproj/InfoPlist.strings',
      sourceTree: '<group>',
    };
    p.objects.VGEXIST00 = {
      isa: 'PBXVariantGroup',
      children: ['FRENONLY0'],
      name: 'InfoPlist.strings',
      sourceTree: '<group>',
    };
    p.objects.BFEXIST00 = { isa: 'PBXBuildFile', fileRef: 'VGEXIST00' };
    asList(p.objects.GRPAPP001.children).push('VGEXIST00');
    asList(p.objects.RSRC0001.files).push('BFEXIST00');

    const s = mutatePbxproj(p, makeUuidFn());
    expect(s.variantGroupCreated).toBe(false);
    expect(asList(p.objects.VGEXIST00.children)).toContain('FRENONLY0'); // reused
    expect(asList(p.objects.VGEXIST00.children)).toHaveLength(2); // + ar
    expect(variantGroups(p)).toHaveLength(1);
    const bfLinks = asList(p.objects.RSRC0001.files).filter(
      (bf) => p.objects[bf]?.fileRef === 'VGEXIST00',
    );
    expect(bfLinks).toHaveLength(1);
  });
});
