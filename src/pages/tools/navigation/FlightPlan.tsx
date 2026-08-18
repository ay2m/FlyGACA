import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { FieldGrid } from '@/components/calc/Grids';
import { useUrlState } from '@/hooks/useUrlState';
import loa from '@/pages/tools/procedures/Loa.module.css';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

export function FlightPlan() {
  const { t } = useTranslation();
  const [i, set] = useUrlState({
    cs: '',
    type: '',
    wake: 'M',
    equip: 'SDFGW/S',
    dep: '',
    dtime: '',
    spd: '',
    lvl: '',
    route: '',
    dest: '',
    eet: '',
    altn: '',
    rmk: '',
  });
  const { copied, copy } = useCopyToClipboard();
  const v = (s: string) => s.trim() || '—';

  const fpl =
    `(FPL-${v(i.cs)}-IS\n` +
    `-1/${v(i.type)}/${i.wake || 'M'}-${v(i.equip)}\n` +
    `-${v(i.dep)}${i.dtime || '----'}\n` +
    `-N${i.spd || '----'}${i.lvl || 'F---'} ${v(i.route)}\n` +
    `-${v(i.dest)}${i.eet || '----'} ${i.altn.trim()}\n` +
    `-RMK/${i.rmk.trim() || 'NIL'})`;

  return (
    <CalcShell
      title={t('tools.items.flight-plan.name')}
      intro={t('tools.items.flight-plan.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('flightPlan.formula')}
      onExample={() => {
        set('cs', 'SVA123');
        set('type', 'A320');
        set('wake', 'M');
        set('equip', 'SDE3FGHIRWY/LB1');
        set('dep', 'OERK');
        set('dtime', '0700');
        set('spd', '0450');
        set('lvl', 'F360');
        set('route', 'KETIV B449 RABAP');
        set('dest', 'OEJN');
        set('eet', '0135');
        set('altn', 'OETF');
        set('rmk', 'TCAS');
      }}
    >
      <FieldGrid>
        <TextField
          label={t('flightPlan.callsign')}
          value={i.cs}
          onChange={(x) => set('cs', x)}
          placeholder="SVA123"
        />
        <TextField
          label={t('flightPlan.type')}
          value={i.type}
          onChange={(x) => set('type', x)}
          placeholder="A320"
        />
        <TextField
          label={t('flightPlan.wake')}
          value={i.wake}
          onChange={(x) => set('wake', x)}
          placeholder="M"
        />
        <TextField
          label={t('flightPlan.equip')}
          value={i.equip}
          onChange={(x) => set('equip', x)}
          placeholder="SDE3FGHIRWY/LB1"
        />
        <TextField
          label={t('flightPlan.dep')}
          value={i.dep}
          onChange={(x) => set('dep', x)}
          placeholder="OERK"
        />
        <TextField
          label={t('flightPlan.depTime')}
          value={i.dtime}
          onChange={(x) => set('dtime', x)}
          placeholder="0700"
        />
        <TextField
          label={t('flightPlan.speed')}
          value={i.spd}
          onChange={(x) => set('spd', x)}
          placeholder="0450"
        />
        <TextField
          label={t('flightPlan.level')}
          value={i.lvl}
          onChange={(x) => set('lvl', x)}
          placeholder="F360"
        />
        <TextField
          label={t('flightPlan.dest')}
          value={i.dest}
          onChange={(x) => set('dest', x)}
          placeholder="OEJN"
        />
        <TextField
          label={t('flightPlan.eet')}
          value={i.eet}
          onChange={(x) => set('eet', x)}
          placeholder="0135"
        />
        <TextField
          label={t('flightPlan.altn')}
          value={i.altn}
          onChange={(x) => set('altn', x)}
          placeholder="OETF"
        />
      </FieldGrid>
      <TextField
        label={t('flightPlan.route')}
        value={i.route}
        onChange={(x) => set('route', x)}
        placeholder="KETIV B449 RABAP"
      />
      <TextField
        label={t('flightPlan.remarks')}
        value={i.rmk}
        onChange={(x) => set('rmk', x)}
        placeholder="TCAS"
      />

      <div className={loa.outputHead}>
        <span>{t('flightPlan.output')}</span>
        <button type="button" className={loa.copy} onClick={() => void copy(fpl)}>
          {copied ? t('flightPlan.copied') : t('flightPlan.copy')}
        </button>
      </div>
      <pre className={loa.letter}>{fpl}</pre>
    </CalcShell>
  );
}
