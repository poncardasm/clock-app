// Drag and Drop functionality for clock cards
// Persists order to localStorage

const STORAGE_KEY = 'clock-card-order';

// Initialize drag and drop
function initDragAndDrop(): void {
  const grid = document.getElementById('clock-grid');
  if (!grid) return;

  const cards = grid.querySelectorAll('.clock-card');
  
  // Restore saved order on page load
  restoreOrder(grid);

  cards.forEach((card) => {
    const htmlCard = card as HTMLElement;
    
    // Mouse/Touch events for drag start
    htmlCard.addEventListener('dragstart', handleDragStart);
    htmlCard.addEventListener('dragend', handleDragEnd);
    
    // Touch events for mobile support
    htmlCard.addEventListener('touchstart', handleTouchStart, { passive: false });
    htmlCard.addEventListener('touchmove', handleTouchMove, { passive: false });
    htmlCard.addEventListener('touchend', handleTouchEnd);
  });

  // Grid container events
  grid.addEventListener('dragover', handleDragOver);
  grid.addEventListener('drop', handleDrop);
  grid.addEventListener('dragenter', handleDragEnter);
  grid.addEventListener('dragleave', handleDragLeave);
}

let draggedElement: HTMLElement | null = null;
let touchDragElement: HTMLElement | null = null;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

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

// Touch event handlers for mobile support
function handleTouchStart(e: TouchEvent): void {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
  
  touchDragElement = e.currentTarget as HTMLElement;
}

function handleTouchMove(e: TouchEvent): void {
  if (!touchDragElement) return;
  
  const touch = e.touches[0];
  const deltaX = Math.abs(touch.clientX - touchStartX);
  const deltaY = Math.abs(touch.clientY - touchStartY);
  
  // If moving more than 10px, prevent scrolling and start drag
  if (deltaX > 10 || deltaY > 10) {
    e.preventDefault();
    touchDragElement.classList.add('dragging');
    
    // Find element under touch
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elementBelow) {
      const cardBelow = elementBelow.closest('.clock-card') as HTMLElement;
      
      // Remove drag-over from all cards
      document.querySelectorAll('.clock-card').forEach((c) => {
        c.classList.remove('drag-over');
      });
      
      // Add drag-over to card below
      if (cardBelow && cardBelow !== touchDragElement) {
        cardBelow.classList.add('drag-over');
      }
    }
  }
}

function handleTouchEnd(e: TouchEvent): void {
  if (!touchDragElement) return;
  
  const touch = e.changedTouches[0];
  const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  
  if (elementBelow) {
    const dropTarget = elementBelow.closest('.clock-card') as HTMLElement;
    
    if (dropTarget && dropTarget !== touchDragElement) {
      const grid = document.getElementById('clock-grid');
      if (!grid) return;
      
      const cards = Array.from(grid.querySelectorAll('.clock-card'));
      const draggedIndex = cards.indexOf(touchDragElement);
      const dropIndex = cards.indexOf(dropTarget);
      
      // Reorder DOM elements
      if (draggedIndex < dropIndex) {
        dropTarget.after(touchDragElement);
      } else {
        dropTarget.before(touchDragElement);
      }
      
      saveOrder();
    }
  }
  
  // Clean up
  touchDragElement.classList.remove('dragging');
  document.querySelectorAll('.clock-card').forEach((c) => {
    c.classList.remove('drag-over');
  });
  
  touchDragElement = null;
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

// Restore order from localStorage
function restoreOrder(grid: HTMLElement): void {
  const savedOrder = localStorage.getItem(STORAGE_KEY);
  if (!savedOrder) return;
  
  try {
    const order: string[] = JSON.parse(savedOrder);
    const cards = Array.from(grid.querySelectorAll('.clock-card'));
    
    // Create a map of location -> card
    const cardMap = new Map<string, HTMLElement>();
    cards.forEach((card) => {
      const location = (card as HTMLElement).dataset.location;
      if (location) {
        cardMap.set(location, card as HTMLElement);
      }
    });
    
    // Reorder cards based on saved order
    order.forEach((location) => {
      const card = cardMap.get(location);
      if (card) {
        grid.appendChild(card);
      }
    });
  } catch (e) {
    console.error('Failed to restore clock card order:', e);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDragAndDrop);
} else {
  initDragAndDrop();
}
