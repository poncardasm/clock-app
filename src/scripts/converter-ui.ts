import {
  formatWallDateLabel,
  parseWallTime,
} from './clock-time';
import {
  type TimeZoneOption,
  filterTimeZoneOptions,
  findTimeZoneOptionByInput,
  findTimeZoneOptionByTimeZone,
  formatZoneInputValue,
} from './converter-timezones';
import {
  type ConverterState,
  computeConverterViewData,
  getDefaultConverterState,
  loadConverterState,
  saveConverterState,
} from './converter-logic';

type ZoneRole = 'source' | 'target';

type ConverterElements = {
  swapButton: HTMLButtonElement;
  sourceZoneInput: HTMLInputElement;
  sourceZoneList: HTMLElement;
  sourceZoneName: HTMLElement;
  sourceTimeInput: HTMLInputElement;
  sourceDateDisplay: HTMLButtonElement;
  sourceDateInput: HTMLInputElement;
  targetZoneInput: HTMLInputElement;
  targetZoneList: HTMLElement;
  targetZoneName: HTMLElement;
  targetTime: HTMLElement;
  targetPeriod: HTMLElement;
  targetDate: HTMLElement;
  relative: HTMLElement;
  hint: HTMLElement;
};

const ZONE_LIST_LIMIT = 80;

let converterElements: ConverterElements | null = null;
let converterState: ConverterState | null = null;
let zoneListHideTimers: Partial<Record<ZoneRole, number>> = {};
let zoneListActiveIndex: Partial<Record<ZoneRole, number>> = {};
let is24HourState = true;

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatSourceTimeForDisplay(time24: string, is24Hour: boolean): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time24);
  if (!match) {
    return time24;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (is24Hour) {
    return `${pad2(hour)}:${pad2(minute)}`;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${pad2(minute)} ${period}`;
}

function parseSourceTimeTo24(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(normalized);
  if (hhmm) {
    const hour = Number(hhmm[1]);
    const minute = Number(hhmm[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${pad2(hour)}:${pad2(minute)}`;
    }
  }

  const hhmmMeridiem = /^(\d{1,2}):(\d{2})\s*([AP]M)$/.exec(normalized);
  if (hhmmMeridiem) {
    const hour = Number(hhmmMeridiem[1]);
    const minute = Number(hhmmMeridiem[2]);
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return null;
    }

    const convertedHour =
      hhmmMeridiem[3] === 'PM' ? (hour % 12) + 12 : hour % 12;
    return `${pad2(convertedHour)}:${pad2(minute)}`;
  }

  return null;
}

function getConverterElements(): ConverterElements | null {
  const swapButton = document.getElementById('converter-swap') as HTMLButtonElement | null;
  const sourceZoneInput = document.getElementById('converter-source-zone') as HTMLInputElement | null;
  const sourceZoneList = document.getElementById('converter-source-zone-list');
  const sourceZoneName = document.getElementById('converter-source-zone-name');
  const sourceTimeInput = document.getElementById('converter-source-time-input') as HTMLInputElement | null;
  const sourceDateDisplay = document.getElementById('converter-source-date-display') as HTMLButtonElement | null;
  const sourceDateInput = document.getElementById('converter-source-date-input') as HTMLInputElement | null;
  const targetZoneInput = document.getElementById('converter-target-zone') as HTMLInputElement | null;
  const targetZoneList = document.getElementById('converter-target-zone-list');
  const targetZoneName = document.getElementById('converter-target-zone-name');
  const targetTime = document.getElementById('converter-target-time');
  const targetPeriod = document.getElementById('converter-target-period');
  const targetDate = document.getElementById('converter-target-date');
  const relative = document.getElementById('converter-relative');
  const hint = document.getElementById('converter-hint');

  if (
    !swapButton ||
    !sourceZoneInput ||
    !sourceZoneList ||
    !sourceZoneName ||
    !sourceTimeInput ||
    !sourceDateDisplay ||
    !sourceDateInput ||
    !targetZoneInput ||
    !targetZoneList ||
    !targetZoneName ||
    !targetTime ||
    !targetPeriod ||
    !targetDate ||
    !relative ||
    !hint
  ) {
    return null;
  }

  return {
    swapButton,
    sourceZoneInput,
    sourceZoneList,
    sourceZoneName,
    sourceTimeInput,
    sourceDateDisplay,
    sourceDateInput,
    targetZoneInput,
    targetZoneList,
    targetZoneName,
    targetTime,
    targetPeriod,
    targetDate,
    relative,
    hint,
  };
}

function getZoneInputAndList(
  elements: ConverterElements,
  role: ZoneRole,
): { input: HTMLInputElement; list: HTMLElement } {
  return role === 'source'
    ? { input: elements.sourceZoneInput, list: elements.sourceZoneList }
    : { input: elements.targetZoneInput, list: elements.targetZoneList };
}

function setZoneListVisibility(
  elements: ConverterElements,
  role: ZoneRole,
  visible: boolean,
): void {
  const { list, input } = getZoneInputAndList(elements, role);
  list.classList.toggle('hidden', !visible);
  input.setAttribute('aria-expanded', visible ? 'true' : 'false');

  if (!visible) {
    zoneListActiveIndex[role] = -1;
  }
}

function hideZoneListLater(elements: ConverterElements, role: ZoneRole): void {
  if (zoneListHideTimers[role]) {
    window.clearTimeout(zoneListHideTimers[role]);
  }

  zoneListHideTimers[role] = window.setTimeout(() => {
    setZoneListVisibility(elements, role, false);
  }, 120);
}

function cancelHideZoneList(role: ZoneRole): void {
  if (!zoneListHideTimers[role]) {
    return;
  }

  window.clearTimeout(zoneListHideTimers[role]);
  zoneListHideTimers[role] = undefined;
}

function getZoneOptionButtons(list: HTMLElement): HTMLButtonElement[] {
  return Array.from(list.querySelectorAll<HTMLButtonElement>('.converter-zone-option'));
}

function setActiveZoneOption(
  elements: ConverterElements,
  role: ZoneRole,
  index: number,
): void {
  const { list } = getZoneInputAndList(elements, role);
  const buttons = getZoneOptionButtons(list);
  if (buttons.length === 0) {
    zoneListActiveIndex[role] = -1;
    return;
  }

  const nextIndex = Math.max(0, Math.min(index, buttons.length - 1));
  zoneListActiveIndex[role] = nextIndex;

  buttons.forEach((button, buttonIndex) => {
    const active = buttonIndex === nextIndex;
    button.dataset.active = active ? 'true' : 'false';
    if (active) {
      button.scrollIntoView({ block: 'nearest' });
    }
  });
}

function moveActiveZoneOption(
  elements: ConverterElements,
  role: ZoneRole,
  delta: number,
): void {
  const { list } = getZoneInputAndList(elements, role);
  const buttons = getZoneOptionButtons(list);
  if (buttons.length === 0) {
    return;
  }

  const current = zoneListActiveIndex[role] ?? -1;
  const nextIndex =
    current < 0
      ? delta > 0
        ? 0
        : buttons.length - 1
      : (current + delta + buttons.length) % buttons.length;

  setActiveZoneOption(elements, role, nextIndex);
}

function renderFromState(
  elements: ConverterElements,
  state: ConverterState,
  persistState: boolean,
  preserveSourceTimeInput = false,
): void {
  converterState = state;

  const view = computeConverterViewData(state, is24HourState);
  if (!view) {
    elements.hint.textContent = 'Enter a valid source date and time.';
    elements.relative.textContent = '';
    return;
  }

  converterState = view.state;
  elements.sourceDateInput.value = view.state.date;
  if (!preserveSourceTimeInput) {
    elements.sourceTimeInput.value = formatSourceTimeForDisplay(
      view.state.time,
      is24HourState,
    );
  }
  elements.sourceDateDisplay.textContent = view.sourceDateDisplay;
  elements.sourceZoneName.textContent = view.sourceZoneName;
  elements.targetZoneName.textContent = view.targetZoneName;
  elements.targetTime.textContent = view.targetPeriod
    ? `${view.targetTime} ${view.targetPeriod}`
    : view.targetTime;
  elements.targetPeriod.textContent = '';
  elements.targetDate.textContent = view.targetDate;
  elements.relative.textContent = '';
  elements.relative.append(document.createTextNode(view.relativeText));
  const emphasis = document.createElement('strong');
  emphasis.textContent = view.relativeEmphasis;
  elements.relative.append(emphasis);
  elements.relative.append(document.createTextNode(view.relativeTail));
  elements.hint.textContent = view.hint;

  if (persistState) {
    saveConverterState(view.state);
  }
}

function applySelectedZone(
  elements: ConverterElements,
  role: ZoneRole,
  option: TimeZoneOption,
): void {
  if (!converterState) {
    return;
  }

  const nextState: ConverterState =
    role === 'source'
      ? { ...converterState, sourceTimeZone: option.timeZone }
      : { ...converterState, targetTimeZone: option.timeZone };

  const { input } = getZoneInputAndList(elements, role);
  input.value = option.label;
  setZoneListVisibility(elements, role, false);
  renderFromState(elements, nextState, true);
}

function selectActiveZoneOption(elements: ConverterElements, role: ZoneRole): boolean {
  const { list } = getZoneInputAndList(elements, role);
  const buttons = getZoneOptionButtons(list);
  if (buttons.length === 0) {
    return false;
  }

  const activeIndex = zoneListActiveIndex[role] ?? -1;
  if (activeIndex < 0 || activeIndex >= buttons.length) {
    return false;
  }

  const activeButton = buttons[activeIndex];
  const timeZone = activeButton.dataset.timeZone;
  if (!timeZone) {
    return false;
  }

  const option = findTimeZoneOptionByTimeZone(timeZone);
  if (!option) {
    return false;
  }

  applySelectedZone(elements, role, option);
  return true;
}

function renderZoneList(elements: ConverterElements, role: ZoneRole): void {
  const { input, list } = getZoneInputAndList(elements, role);
  const matches = filterTimeZoneOptions(input.value, ZONE_LIST_LIMIT);

  list.innerHTML = '';
  if (matches.length === 0) {
    setZoneListVisibility(elements, role, false);
    return;
  }

  matches.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'converter-zone-option';
    button.textContent = option.label;
    button.dataset.timeZone = option.timeZone;
    button.setAttribute('role', 'option');

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      applySelectedZone(elements, role, option);
    });

    list.appendChild(button);
  });

  setZoneListVisibility(elements, role, true);
  setActiveZoneOption(elements, role, 0);
}

function syncInputsFromState(elements: ConverterElements, state: ConverterState): void {
  elements.sourceZoneInput.value = formatZoneInputValue(state.sourceTimeZone);
  elements.targetZoneInput.value = formatZoneInputValue(state.targetTimeZone);
  elements.sourceDateInput.value = state.date;
  elements.sourceTimeInput.value = formatSourceTimeForDisplay(
    state.time,
    is24HourState,
  );

  const wall = parseWallTime(state.date, state.time);
  elements.sourceDateDisplay.textContent = wall ? formatWallDateLabel(wall) : '';
}

function applyZoneInput(elements: ConverterElements, role: ZoneRole): void {
  if (!converterState) {
    return;
  }

  const { input } = getZoneInputAndList(elements, role);
  const selected = findTimeZoneOptionByInput(input.value);

  if (!selected) {
    const currentTimeZone =
      role === 'source' ? converterState.sourceTimeZone : converterState.targetTimeZone;
    input.value = formatZoneInputValue(currentTimeZone);
    setZoneListVisibility(elements, role, false);
    return;
  }

  applySelectedZone(elements, role, selected);
}

function swapConverterValues(elements: ConverterElements): void {
  if (!converterState) {
    return;
  }

  const nextState: ConverterState = {
    ...converterState,
    sourceTimeZone: converterState.targetTimeZone,
    targetTimeZone: converterState.sourceTimeZone,
  };

  syncInputsFromState(elements, nextState);
  renderFromState(elements, nextState, true);
}

function attachZoneInputEvents(elements: ConverterElements, role: ZoneRole): void {
  const { input, list } = getZoneInputAndList(elements, role);

  input.addEventListener('focus', () => {
    cancelHideZoneList(role);
    renderZoneList(elements, role);
  });

  input.addEventListener('input', () => {
    renderZoneList(elements, role);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (list.classList.contains('hidden')) {
        renderZoneList(elements, role);
      }
      moveActiveZoneOption(elements, role, 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.classList.contains('hidden')) {
        renderZoneList(elements, role);
      }
      moveActiveZoneOption(elements, role, -1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (selectActiveZoneOption(elements, role)) {
        return;
      }
      applyZoneInput(elements, role);
      return;
    }

    if (event.key === 'Escape') {
      setZoneListVisibility(elements, role, false);
      return;
    }
  });

  input.addEventListener('blur', () => {
    hideZoneListLater(elements, role);
    applyZoneInput(elements, role);
  });

  list.addEventListener('mouseenter', () => {
    cancelHideZoneList(role);
  });

  list.addEventListener('mouseleave', () => {
    hideZoneListLater(elements, role);
  });
}

export function initConverter(getIs24Hour: () => boolean): void {
  const elements = getConverterElements();
  if (!elements) {
    return;
  }

  converterElements = elements;
  converterState = loadConverterState() ?? getDefaultConverterState();
  is24HourState = getIs24Hour();

  syncInputsFromState(elements, converterState);
  renderFromState(elements, converterState, false);

  elements.swapButton.addEventListener('click', () => {
    swapConverterValues(elements);
  });

  const onDateTimeChange = (preserveSourceTimeInput = false): void => {
    if (!converterState) {
      return;
    }

    const parsedTime = parseSourceTimeTo24(elements.sourceTimeInput.value);
    if (!parsedTime) {
      elements.hint.textContent =
        'Enter time as HH:MM (24H) or h:MM AM/PM (12H).';
      return;
    }

    const nextState: ConverterState = {
      ...converterState,
      date: elements.sourceDateInput.value,
      time: parsedTime,
    };

    renderFromState(elements, nextState, true, preserveSourceTimeInput);
  };

  elements.sourceTimeInput.addEventListener('input', () => {
    onDateTimeChange(true);
  });
  elements.sourceTimeInput.addEventListener('change', () => {
    onDateTimeChange(false);
  });
  elements.sourceDateInput.addEventListener('input', () => {
    onDateTimeChange(false);
  });
  elements.sourceDateInput.addEventListener('change', () => {
    onDateTimeChange(false);
  });

  attachZoneInputEvents(elements, 'source');
  attachZoneInputEvents(elements, 'target');

  elements.sourceDateDisplay.addEventListener('click', () => {
    if (typeof elements.sourceDateInput.showPicker === 'function') {
      elements.sourceDateInput.showPicker();
      return;
    }
    elements.sourceDateInput.focus();
    elements.sourceDateInput.click();
  });
}

export function refreshConverterForFormatChange(is24Hour: boolean): void {
  is24HourState = is24Hour;

  if (!converterElements || !converterState) {
    return;
  }

  renderFromState(converterElements, converterState, false);
}
