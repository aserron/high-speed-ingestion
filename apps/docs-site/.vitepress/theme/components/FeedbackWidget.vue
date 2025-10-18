<template>
  <div class="feedback-widget">
    <div v-if="!showForm" class="feedback-trigger">
      <button @click="showForm = true" class="feedback-button">
        💬 Feedback
      </button>
    </div>
    
    <div v-if="showForm" class="feedback-form" :class="{ submitted: isSubmitted }">
      <div v-if="!isSubmitted" class="form-content">
        <div class="form-header">
          <h4>Help us improve this page</h4>
          <button @click="closeForm" class="close-button">×</button>
        </div>
        
        <div class="rating-section">
          <p>How helpful was this page?</p>
          <div class="rating-stars">
            <button 
              v-for="star in 5" 
              :key="star"
              @click="setRating(star)"
              :class="['star', { active: star <= rating }]"
            >
              ★
            </button>
          </div>
        </div>
        
        <div class="feedback-type">
          <p>What type of feedback do you have?</p>
          <div class="feedback-options">
            <label v-for="type in feedbackTypes" :key="type.value" class="feedback-option">
              <input 
                type="radio" 
                :value="type.value" 
                v-model="selectedType"
                name="feedbackType"
              />
              <span class="option-icon">{{ type.icon }}</span>
              <span class="option-label">{{ type.label }}</span>
            </label>
          </div>
        </div>
        
        <div class="comment-section">
          <label for="comment">Additional comments (optional)</label>
          <textarea 
            id="comment"
            v-model="comment"
            placeholder="Tell us more about your experience..."
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button @click="closeForm" class="cancel-button">Cancel</button>
          <button @click="submitFeedback" class="submit-button" :disabled="!rating">
            Submit Feedback
          </button>
        </div>
      </div>
      
      <div v-if="isSubmitted" class="success-message">
        <div class="success-icon">✅</div>
        <h4>Thank you for your feedback!</h4>
        <p>Your input helps us improve the documentation.</p>
        <button @click="resetForm" class="close-success">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const showForm = ref(false)
const isSubmitted = ref(false)
const rating = ref(0)
const selectedType = ref('')
const comment = ref('')

const feedbackTypes = [
  { value: 'helpful', icon: '👍', label: 'Helpful' },
  { value: 'confusing', icon: '😕', label: 'Confusing' },
  { value: 'incorrect', icon: '❌', label: 'Incorrect' },
  { value: 'missing', icon: '📝', label: 'Missing info' },
  { value: 'suggestion', icon: '💡', label: 'Suggestion' }
]

function setRating(stars) {
  rating.value = stars
}

function closeForm() {
  showForm.value = false
  resetFormData()
}

function resetForm() {
  showForm.value = false
  isSubmitted.value = false
  resetFormData()
}

function resetFormData() {
  rating.value = 0
  selectedType.value = ''
  comment.value = ''
}

function submitFeedback() {
  if (!rating.value) return
  
  // In a real implementation, this would send data to an analytics service
  const feedbackData = {
    page: window.location.pathname,
    rating: rating.value,
    type: selectedType.value,
    comment: comment.value,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  }
  
  console.log('Feedback submitted:', feedbackData)
  
  // Simulate API call
  setTimeout(() => {
    isSubmitted.value = true
  }, 500)
}
</script>

<style scoped>
.feedback-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.feedback-trigger {
  display: flex;
  justify-content: flex-end;
}

.feedback-button {
  padding: 12px 16px;
  background-color: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transition: all 0.25s;
}

.feedback-button:hover {
  background-color: var(--vp-c-brand-2);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.feedback-form {
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 320px;
  max-width: calc(100vw - 40px);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-content {
  padding: 20px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.form-header h4 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 1rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.25s;
}

.close-button:hover {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.rating-section {
  margin-bottom: 16px;
}

.rating-section p {
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}

.rating-stars {
  display: flex;
  gap: 4px;
}

.star {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--vp-c-border);
  cursor: pointer;
  transition: color 0.25s;
  padding: 4px;
  border-radius: 4px;
}

.star:hover,
.star.active {
  color: #fbbf24;
}

.feedback-type {
  margin-bottom: 16px;
}

.feedback-type p {
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}

.feedback-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.feedback-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s;
  font-size: 0.875rem;
}

.feedback-option:hover {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft);
}

.feedback-option input[type="radio"] {
  margin: 0;
}

.option-icon {
  font-size: 1rem;
}

.option-label {
  color: var(--vp-c-text-1);
  font-size: 0.75rem;
}

.comment-section {
  margin-bottom: 16px;
}

.comment-section label {
  display: block;
  margin-bottom: 6px;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}

.comment-section textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
}

.comment-section textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.cancel-button,
.submit-button {
  padding: 8px 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.25s;
}

.cancel-button {
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.cancel-button:hover {
  background-color: var(--vp-c-bg-soft);
}

.submit-button {
  background-color: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.submit-button:hover:not(:disabled) {
  background-color: var(--vp-c-brand-2);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-message {
  padding: 24px;
  text-align: center;
}

.success-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.success-message h4 {
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
}

.success-message p {
  margin: 0 0 16px 0;
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
}

.close-success {
  padding: 8px 16px;
  background-color: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .feedback-widget {
    bottom: 16px;
    right: 16px;
    left: 16px;
  }
  
  .feedback-form {
    width: auto;
  }
  
  .feedback-options {
    grid-template-columns: 1fr;
  }
}
</style>