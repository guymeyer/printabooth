# Flattens PrusaSlicer system presets (printer + print + filament) into the project config that the exported .3mf files
# carry, so PrusaSlicer selects those presets unmodified on open.
#   python3 tools/prusa/flatten.py path/to/PrusaResearch.ini
# PrusaResearch.ini is in the PrusaSlicer repo under resources/profiles/ (this repo used tag version_2.9.7).
# Writes app/xl.config and app/coreone.config.
import re, sys, json, os
def parse(path):
    secs = {}; cur = None
    for line in open(path, encoding='utf-8'):
        line = line.rstrip('\n')
        m = re.match(r'^\[([a-z_]+):(.+)\]\s*$', line)
        if m: cur = (m.group(1), m.group(2)); secs[cur] = {}; continue
        if re.match(r'^\[', line): cur = None; continue
        if cur is None or not line.strip() or line.lstrip().startswith('#') or line.lstrip().startswith(';'): continue
        k, _, v = line.partition('=')
        secs[cur][k.strip()] = v.strip()
    return secs
S = parse(sys.argv[1] if len(sys.argv) > 1 else 'PrusaResearch.ini')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'app')
def flat(typ, name, depth=0):
    sec = S[(typ, name)]
    out = {}
    inh = sec.get('inherits', '')
    for p in [x.strip() for x in inh.split(';') if x.strip()]:
        out.update(flat(typ, p, depth+1))
    for k, v in sec.items():
        if k != 'inherits': out[k] = v
    return out
SKIP = {'inherits','renamed_from','alias','compatible_printers','compatible_printers_condition','compatible_prints','compatible_prints_condition','visible'}
def project(printer, print_, filament):
    cfg = {}
    for typ, n in (('print', print_), ('filament', filament), ('printer', printer)):
        f = flat(typ, n)
        cfg.update({k: v for k, v in f.items() if k not in SKIP})
    cfg['print_settings_id'] = print_
    cfg['filament_settings_id'] = '"%s"' % filament
    cfg['printer_settings_id'] = printer
    cfg['physical_printer_settings_id'] = ''
    cfg['printer_technology'] = 'FFF'
    return cfg
def conds(printer, print_, filament):
    return {t: S[(t, n)].get('compatible_printers_condition', '(inherited)') for t, n in (('print', print_), ('filament', filament))}, flat('print', print_).get('compatible_printers_condition'), flat('filament', filament).get('compatible_printers_condition'), flat('filament', filament).get('compatible_prints_condition')
sets = {
  'xl': ('Original Prusa XL Input Shaper 0.6 nozzle', '0.20mm STRUCTURAL @XLIS 0.6', 'Prusament PETG @XL 0.6'),
  'coreone': ('Prusa CORE One HF0.4 nozzle', '0.20mm SPEED @COREONE HF0.4', 'Prusament PETG @COREONE HF0.4'),
}
for key, (pr, pt, fl) in sets.items():
    cfg = project(pr, pt, fl)
    print(key, len(cfg), 'bed_shape', cfg.get('bed_shape'), 'printer_model', cfg.get('printer_model'), 'nozzle', cfg.get('nozzle_diameter'), 'layer', cfg.get('layer_height'), 'efc', cfg.get('elefant_foot_compensation'), 'seam', cfg.get('seam_position'))
    print('   conds', conds(pr, pt, fl)[1:])
    lines = ['; Project settings: %s / %s / %s (PrusaSlicer system presets, profile bundle %s)' % (pr, pt, fl, S.get(('vendor','PrusaResearch'),{}).get('config_version','?'))]
    for k in sorted(cfg): lines.append('; %s = %s' % (k, cfg[k]))
    open(os.path.join(OUT, key + '.config'), 'w').write('\n'.join(lines) + '\n')
