import { relations } from 'drizzle-orm';

import {
  exercise,
  routine,
  routineDay,
  routineExercise,
  workout,
  workoutExercise,
  workoutSet,
} from './schema';

export const routineRelations = relations(routine, ({ many }) => ({
  days: many(routineDay),
}));

export const routineDayRelations = relations(routineDay, ({ one, many }) => ({
  routine: one(routine, { fields: [routineDay.routineId], references: [routine.id] }),
  exercises: many(routineExercise),
}));

export const routineExerciseRelations = relations(routineExercise, ({ one }) => ({
  day: one(routineDay, { fields: [routineExercise.routineDayId], references: [routineDay.id] }),
  exercise: one(exercise, { fields: [routineExercise.exerciseId], references: [exercise.id] }),
}));

export const workoutRelations = relations(workout, ({ many, one }) => ({
  exercises: many(workoutExercise),
  routineDay: one(routineDay, { fields: [workout.routineDayId], references: [routineDay.id] }),
}));

export const workoutExerciseRelations = relations(workoutExercise, ({ one, many }) => ({
  workout: one(workout, { fields: [workoutExercise.workoutId], references: [workout.id] }),
  exercise: one(exercise, { fields: [workoutExercise.exerciseId], references: [exercise.id] }),
  sets: many(workoutSet),
}));

export const workoutSetRelations = relations(workoutSet, ({ one }) => ({
  workoutExercise: one(workoutExercise, {
    fields: [workoutSet.workoutExerciseId],
    references: [workoutExercise.id],
  }),
}));
