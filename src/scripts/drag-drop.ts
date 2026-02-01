// Drag and Drop functionality for clock cards
// Persists order to localStorage

const STORAGE_KEY = 'clock-card-order';

// Check if device is mobile (touch-only)
function isMobile(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

// Initialize drag and drop
function initDragAndDrop(): void {
  const grid = document.getElementById('clock-grid');
  if (!grid) return;

  const cards = grid.querySelectorAll('.clock-card');
  
  // Restore saved order on page load
  restoreOrder(grid);

  // Disable drag and drop on mobile devices
  if (isMobile()) {
    cards.forEach((card) => {
      const htmlCard = card as HTMLElement;
      htmlCard.removeAttribute('draggable');
      htmlCard.classList.remove('cursor-move');
    });
    return;
  }

  cards.forEach((card) => {
    const htmlCard = card as HTMLElement;
    
    // Mouse events for drag start (desktop only)
    htmlCard.addEventListener('dragstart', handleDragStart);
    htmlCard.addEventListener('dragend', handleDragEnd);
  });

  // Grid container events
  grid.addEventListener('dragover', handleDragOver);
  grid.addEventListener('drop', handleDrop);
  grid.addEventListener('dragenter', handleDragEnter);
  grid.addEventListener('dragleave', handleDragLeave);
}

let draggedElement: HTMLElement | null = null;

// Drag start handler
function handleDragStart(e: DragEvent): void {
  draggedElement = e.target as HTMLElement;
  draggedElement.classList.add('dragging');
  
  // Set drag data
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedElement.dataset.location || '');
  }
}

// Drag end handler
function handleDragEnd(e: DragEvent): void {
  const card = e.target as HTMLElement;
  card.classList.remove('dragging');
  
  // Remove drag-over class from all cards
  document.querySelectorAll('.clock-card').forEach((c) => {
    c.classList.remove('drag-over');
  });
  
  draggedElement = null;
  saveOrder();
}

// Drag over handler
function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
}

// Drag enter handler
function handleDragEnter(e: DragEvent): void {
  e.preventDefault();
  const target = e.target as HTMLElement;
  const card = target.closest('.clock-card') as HTMLElement;
  
  if (card && card !== draggedElement) {
    card.classList.add('drag-over');
  }
}

// Drag leave handler
function handleDragLeave(e: DragEvent): void {
  const target = e.target as HTMLElement;
  const card = target.closest('.clock-card') as HTMLElement;
  
  if (card) {
    card.classList.remove('drag-over');
  }
}

// Drop handler
function handleDrop(e: DragEvent): void {
  e.preventDefault();
  
  if (!draggedElement) return;
  
  const target = e.target as HTMLElement;
  const dropTarget = target.closest('.clock-card') as HTMLElement;
  
  if (dropTarget && dropTarget !== draggedElement) {
    const grid = document.getElementById('clock-grid');
    if (!grid) return;
    
    // Get all cards
    const cards = Array.from(grid.querySelectorAll('.clock-card'));
    const draggedIndex = cards.indexOf(draggedElement);
    const dropIndex = cards.indexOf(dropTarget);
    
    // Reorder DOM elements
    if (draggedIndex < dropIndex) {
      dropTarget.after(draggedElement);
    } else {
      dropTarget.before(draggedElement);
    }
    
    // Remove drag-over class
    dropTarget.classList.remove('drag-over');
    
    // Save the new order
    saveOrder();
  }
}



// Save order to localStorage
function saveOrder(): void {
  const grid = document.getElementById('clock-grid');
  if (!grid) return;
  
  const cards = grid.querySelectorAll('.clock-card');
  const order = Array.from(cards).map((card) => {
    return (card as HTMLElement).dataset.location || '';
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

// Default order: UTC, Finland, Philippines, Netherlands, San Francisco, Beijing, Sydney, Tokyo
const DEFAULT_ORDER = ['utc', 'helsinki', 'manila', 'netherlands', 'san-francisco', 'beijing', 'sydney', 'tokyo'];

// Restore order from localStorage or use default
function restoreOrder(grid: HTMLElement): void {
  const savedOrder = localStorage.getItem(STORAGE_KEY);
  let order: string[];
  
  if (savedOrder) {
    try {
      order = JSON.parse(savedOrder);
    } catch (e) {
      console.error('Failed to parse saved order:', e);
      order = DEFAULT_ORDER;
    }
  } else {
    order = DEFAULT_ORDER;
  }
  
  const cards = Array.from(grid.querySelectorAll('.clock-card'));
  
  // Create a map of location -> card
  const cardMap = new Map<string, HTMLElement>();
  cards.forEach((card) => {
    const location = (card as HTMLElement).dataset.location;
    if (location) {
      cardMap.set(location, card as HTMLElement);
    }
  });
  
  // Reorder cards based on order
  order.forEach((location) => {
    const card = cardMap.get(location);
    if (card) {
      grid.appendChild(card);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDragAndDrop);
} else {
  initDragAndDrop();
}
