# Todo Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent, flat category system to todos — pick a category when creating, filter by category in the list, manage categories inline.

**Architecture:** New `todo-category` NestJS module (entity + CRUD controller) with a separate `todo_category` table unrelated to finance categories. `todo` table gets a nullable `category_id` FK with ON DELETE SET NULL. Frontend adds category state + tag bar + filter bar to `TodoPage.tsx`.

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL, React 19, Tailwind CSS 4, shadcn/ui

---

## File Map

**Backend — create:**
- `backend/src/todo-category/todo-category.entity.ts`
- `backend/src/todo-category/dto/create-todo-category.dto.ts`
- `backend/src/todo-category/todo-category.service.ts`
- `backend/src/todo-category/todo-category.controller.ts`
- `backend/src/todo-category/todo-category.module.ts`
- `backend/src/migrations/1780000000000-TodoCategoryAndTodoFk.ts`

**Backend — modify:**
- `backend/src/todo/todo.entity.ts` — add `category_id` column + `ManyToOne` relation
- `backend/src/todo/dto/create-todo.dto.ts` — add optional `category_id`
- `backend/src/todo/todo.service.ts` — pass `category_id` on create; join `category` on reads
- `backend/src/todo/todo.controller.ts` — pass `dto.category_id` to service
- `backend/src/data-source.ts` — register `TodoCategory` entity + new migration

**Frontend — create:**
- `frontend/src/api/todoCategory.ts`

**Frontend — modify:**
- `frontend/src/api/todo.ts` — add `category` field to `Todo`; update `create()`
- `frontend/src/pages/TodoPage.tsx` — add category state, tag bar, filter bar, badges

---

## Task 1: Backend — TodoCategory entity, DTO, module

**Files:**
- Create: `backend/src/todo-category/todo-category.entity.ts`
- Create: `backend/src/todo-category/dto/create-todo-category.dto.ts`
- Create: `backend/src/todo-category/todo-category.service.ts`
- Create: `backend/src/todo-category/todo-category.controller.ts`
- Create: `backend/src/todo-category/todo-category.module.ts`

- [ ] **Step 1: Create the entity**

`backend/src/todo-category/todo-category.entity.ts`:
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
@Index('idx_todo_category_user', ['user_id'])
export class TodoCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  user_id!: number;

  @Column({ length: 50 })
  name!: string;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 2: Create the DTO**

`backend/src/todo-category/dto/create-todo-category.dto.ts`:
```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTodoCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;
}
```

- [ ] **Step 3: Create the service**

`backend/src/todo-category/todo-category.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TodoCategory } from './todo-category.entity';

@Injectable()
export class TodoCategoryService {
  constructor(
    @InjectRepository(TodoCategory)
    private readonly repo: Repository<TodoCategory>,
  ) {}

  findAll(userId: number): Promise<TodoCategory[]> {
    return this.repo.find({ where: { user_id: userId }, order: { created_at: 'ASC' } });
  }

  create(userId: number, name: string): Promise<TodoCategory> {
    return this.repo.save(this.repo.create({ user_id: userId, name }));
  }

  async remove(userId: number, id: number): Promise<void> {
    const cat = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!cat) throw new NotFoundException(`TodoCategory ${id} not found`);
    await this.repo.remove(cat);
  }
}
```

- [ ] **Step 4: Create the controller**

`backend/src/todo-category/todo-category.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TodoCategoryService } from './todo-category.service';
import { CreateTodoCategoryDto } from './dto/create-todo-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('todo-categories')
@UseGuards(JwtAuthGuard)
export class TodoCategoryController {
  constructor(private readonly service: TodoCategoryService) {}

  @Get()
  findAll(@CurrentUserId() userId: number) {
    return this.service.findAll(userId);
  }

  @Post()
  create(@CurrentUserId() userId: number, @Body() dto: CreateTodoCategoryDto) {
    return this.service.create(userId, dto.name);
  }

  @Delete(':id')
  remove(@CurrentUserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(userId, id);
  }
}
```

- [ ] **Step 5: Create the module**

`backend/src/todo-category/todo-category.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoCategory } from './todo-category.entity';
import { TodoCategoryService } from './todo-category.service';
import { TodoCategoryController } from './todo-category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TodoCategory])],
  providers: [TodoCategoryService],
  controllers: [TodoCategoryController],
})
export class TodoCategoryModule {}
```

- [ ] **Step 6: Register in AppModule**

In `backend/src/app.module.ts`, add two lines:

```typescript
// top of file — add to imports:
import { TodoCategoryModule } from './todo-category/todo-category.module';

// inside @Module({ imports: [...] }) — add after CategoryModule:
TodoCategoryModule,
```

Full `app.module.ts` after change:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { TodoModule } from './todo/todo.module';
import { TimerModule } from './timer/timer.module';
import { ReminderModule } from './reminder/reminder.module';
import { FinanceModule } from './finance/finance.module';
import { ClassifyModule } from './classify/classify.module';
import { CategoryModule } from './category/category.module';
import { TodoCategoryModule } from './todo-category/todo-category.module';
import { dataSourceOptions } from './data-source';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AiModule,
    AuthModule,
    TodoModule,
    TimerModule,
    ReminderModule,
    FinanceModule,
    ClassifyModule,
    CategoryModule,
    TodoCategoryModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Commit**

```bash
cd backend
git add src/todo-category src/app.module.ts
git commit -m "feat: add TodoCategory entity, service, controller, module"
```

---

## Task 2: Backend — Todo entity update + migration

**Files:**
- Modify: `backend/src/todo/todo.entity.ts`
- Modify: `backend/src/todo/dto/create-todo.dto.ts`
- Create: `backend/src/migrations/1780000000000-TodoCategoryAndTodoFk.ts`
- Modify: `backend/src/data-source.ts`

- [ ] **Step 1: Update Todo entity**

Replace the full content of `backend/src/todo/todo.entity.ts`:
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TodoImage } from './todo-image.entity';
import { TodoCategory } from '../todo-category/todo-category.entity';

@Entity()
@Index('idx_todo_user', ['user_id'])
export class Todo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  user_id!: number;

  @Column()
  content!: string;

  @Column({ default: false })
  is_done!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ nullable: true, type: 'timestamp' })
  done_at!: Date | null;

  @Column({ nullable: true, type: 'integer' })
  category_id!: number | null;

  @ManyToOne(() => TodoCategory, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'category_id' })
  category!: TodoCategory | null;

  @OneToMany(() => TodoImage, (image) => image.todo, { cascade: true })
  images!: TodoImage[];
}
```

- [ ] **Step 2: Update CreateTodoDto**

Replace `backend/src/todo/dto/create-todo.dto.ts`:
```typescript
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;
}
```

- [ ] **Step 3: Write the migration file**

Create `backend/src/migrations/1780000000000-TodoCategoryAndTodoFk.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class TodoCategoryAndTodoFk1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "todo_category" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "name" varchar(50) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_todo_category_user" ON "todo_category" ("user_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "todo"
        ADD COLUMN "category_id" integer
          REFERENCES "todo_category"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "todo" DROP COLUMN "category_id"`);
    await queryRunner.query(`DROP INDEX "idx_todo_category_user"`);
    await queryRunner.query(`DROP TABLE "todo_category"`);
  }
}
```

- [ ] **Step 4: Register entity and migration in data-source.ts**

Replace the full content of `backend/src/data-source.ts`:
```typescript
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { Reminder } from './reminder/reminder.entity';
import { Timer } from './timer/timer.entity';
import { Todo } from './todo/todo.entity';
import { TodoImage } from './todo/todo-image.entity';
import { FinanceRecord } from './finance/finance.entity';
import { Category } from './category/category.entity';
import { TodoCategory } from './todo-category/todo-category.entity';
import { User } from './auth/user.entity';
import { EmailVerification } from './auth/email-verification.entity';
import { InitialSchemaPg1748000000000 } from './migrations/1748000000000-InitialSchemaPg';
import { TodoCategoryAndTodoFk1780000000000 } from './migrations/1780000000000-TodoCategoryAndTodoFk';

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: required('DB_USERNAME'),
  password: required('DB_PASSWORD'),
  database: required('DB_DATABASE'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [
    Reminder,
    Timer,
    Todo,
    TodoImage,
    FinanceRecord,
    Category,
    TodoCategory,
    User,
    EmailVerification,
  ],
  migrations: [InitialSchemaPg1748000000000, TodoCategoryAndTodoFk1780000000000],
  synchronize: false,
  migrationsRun: process.env.NODE_ENV !== 'production',
  logging: process.env.TYPEORM_LOGGING === '1',
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
```

- [ ] **Step 5: Run migration in dev mode**

The migration runs automatically on next `npm run start:dev` because `migrationsRun: true` in development. Start the server and look for the migration log:

```bash
cd backend
npm run start:dev
```

Expected in server log:
```
query: SELECT * FROM "migrations"
query: CREATE TABLE "todo_category" ...
query: CREATE INDEX "idx_todo_category_user" ...
query: ALTER TABLE "todo" ADD COLUMN "category_id" ...
```

If the server is already running, restart it. If you need to run migration manually:
```bash
npm run migration:run
```

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/todo/todo.entity.ts src/todo/dto/create-todo.dto.ts \
        src/migrations/1780000000000-TodoCategoryAndTodoFk.ts \
        src/data-source.ts
git commit -m "feat: add category_id to Todo entity and migration"
```

---

## Task 3: Backend — TodoService + TodoController update

**Files:**
- Modify: `backend/src/todo/todo.service.ts`
- Modify: `backend/src/todo/todo.controller.ts`

- [ ] **Step 1: Update TodoService**

Replace the full content of `backend/src/todo/todo.service.ts`:
```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Todo } from './todo.entity';
import { TodoImage } from './todo-image.entity';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo) private todoRepo: Repository<Todo>,
    @InjectRepository(TodoImage) private imageRepo: Repository<TodoImage>,
    private dataSource: DataSource,
    private storage: SupabaseStorageService,
  ) {}

  findAll(userId: number): Promise<Todo[]> {
    return this.todoRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      relations: ['images', 'category'],
    });
  }

  async create(
    userId: number,
    content: string,
    files: Express.Multer.File[],
    categoryId?: number,
  ): Promise<Todo> {
    if (files.length > 9) {
      throw new BadRequestException(`Cannot attach more than 9 images`);
    }

    const uploadedUrls = await this.uploadFiles(files);

    try {
      const savedId = await this.dataSource.transaction(async (manager) => {
        const todoRepo = manager.getRepository(Todo);
        const imageRepo = manager.getRepository(TodoImage);
        const saved = await todoRepo.save(
          todoRepo.create({
            content,
            user_id: userId,
            category_id: categoryId ?? null,
          }),
        );
        if (uploadedUrls.length > 0) {
          const entities = uploadedUrls.map((url, i) =>
            imageRepo.create({ todo: saved, image_path: url, sort_order: i }),
          );
          await imageRepo.save(entities);
        }
        return saved.id;
      });
      return (await this.todoRepo.findOne({
        where: { id: savedId, user_id: userId },
        relations: ['images', 'category'],
      })) as Todo;
    } catch (err) {
      await this.deleteUrls(uploadedUrls);
      throw err;
    }
  }

  async update(
    userId: number,
    id: number,
    dto: { content?: string; is_done?: boolean },
  ): Promise<Todo> {
    const todo = await this.todoRepo.findOne({
      where: { id, user_id: userId },
      relations: ['images', 'category'],
    });
    if (!todo) throw new NotFoundException(`Todo ${id} not found`);
    if (dto.content !== undefined) todo.content = dto.content;
    if (dto.is_done !== undefined) {
      todo.is_done = dto.is_done;
      todo.done_at = dto.is_done ? new Date() : null;
    }
    return this.todoRepo.save(todo);
  }

  async remove(userId: number, id: number): Promise<void> {
    const todo = await this.todoRepo.findOne({
      where: { id, user_id: userId },
      relations: ['images'],
    });
    if (!todo) throw new NotFoundException(`Todo ${id} not found`);
    const urls = todo.images.map((i) => i.image_path);
    await this.todoRepo.remove(todo);
    await this.deleteUrls(urls);
  }

  async addImages(
    userId: number,
    todoId: number,
    files: Express.Multer.File[],
  ): Promise<Todo> {
    const todo = await this.todoRepo.findOne({
      where: { id: todoId, user_id: userId },
      relations: ['images'],
    });
    if (!todo) throw new NotFoundException(`Todo ${todoId} not found`);
    if (todo.images.length + files.length > 9) {
      throw new BadRequestException(`Todo cannot have more than 9 images`);
    }

    const uploadedUrls = await this.uploadFiles(files);

    try {
      await this.dataSource.transaction(async (manager) => {
        const imageRepo = manager.getRepository(TodoImage);
        const startOrder = todo.images.length;
        const entities = uploadedUrls.map((url, i) =>
          imageRepo.create({ todo, image_path: url, sort_order: startOrder + i }),
        );
        await imageRepo.save(entities);
      });
      return (await this.todoRepo.findOne({
        where: { id: todoId, user_id: userId },
        relations: ['images', 'category'],
      })) as Todo;
    } catch (err) {
      await this.deleteUrls(uploadedUrls);
      throw err;
    }
  }

  async removeImage(
    userId: number,
    todoId: number,
    imageId: number,
  ): Promise<void> {
    const image = await this.imageRepo.findOne({
      where: { id: imageId, todo: { id: todoId, user_id: userId } },
      relations: ['todo'],
    });
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);
    const url = image.image_path;
    await this.imageRepo.remove(image);
    await this.storage.delete(url);
  }

  private async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    const urls: string[] = [];
    try {
      for (const file of files) {
        urls.push(await this.storage.upload(file));
      }
      return urls;
    } catch (err) {
      await this.deleteUrls(urls);
      throw err;
    }
  }

  private async deleteUrls(urls: string[]): Promise<void> {
    for (const url of urls) {
      try {
        await this.storage.delete(url);
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}
```

- [ ] **Step 2: Update TodoController.create to pass category_id**

In `backend/src/todo/todo.controller.ts`, change only the `create` method body:

```typescript
  @Post()
  @UseInterceptors(FilesInterceptor('images', 9, multerOptions))
  create(
    @CurrentUserId() userId: number,
    @Body() dto: CreateTodoDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.todoService.create(userId, dto.content, files, dto.category_id);
  }
```

- [ ] **Step 3: Verify backend compiles**

```bash
cd backend
npm run build
```

Expected: no TypeScript errors, output in `dist/`.

- [ ] **Step 4: Smoke-test the API (server must be running)**

```bash
# Get a token first (replace with real credentials)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"your@email.com","password":"yourpass"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Create a todo category
curl -s -X POST http://localhost:3001/api/todo-categories \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"工作"}' | python3 -m json.tool
# Expected: {"id":1,"user_id":...,"name":"工作","created_at":"..."}

# List categories
curl -s http://localhost:3001/api/todo-categories \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
# Expected: [{"id":1,...,"name":"工作",...}]

# Create a todo with that category
curl -s -X POST http://localhost:3001/api/todos \
  -H "Authorization: Bearer $TOKEN" \
  -F 'content=整理季度汇报' \
  -F 'category_id=1' | python3 -m json.tool
# Expected: {...,"category":{"id":1,"name":"工作","created_at":"..."},...}

# Create a todo without category
curl -s -X POST http://localhost:3001/api/todos \
  -H "Authorization: Bearer $TOKEN" \
  -F 'content=无分类待办' | python3 -m json.tool
# Expected: {...,"category":null,...}

# Delete the category — todo's category_id should become null
curl -s -X DELETE http://localhost:3001/api/todo-categories/1 \
  -H "Authorization: Bearer $TOKEN"
# Then GET /api/todos and confirm the first todo now has "category":null
```

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/todo/todo.service.ts src/todo/todo.controller.ts
git commit -m "feat: pass category_id through Todo create and join category on reads"
```

---

## Task 4: Frontend — API layer

**Files:**
- Create: `frontend/src/api/todoCategory.ts`
- Modify: `frontend/src/api/todo.ts`

- [ ] **Step 1: Create todoCategory API client**

Create `frontend/src/api/todoCategory.ts`:
```typescript
import { http } from './http';

export interface TodoCategory {
  id: number;
  name: string;
}

export const todoCategoryApi = {
  getAll: (): Promise<TodoCategory[]> =>
    http.get<TodoCategory[]>('/api/todo-categories').then((r) => r.data),

  create: (name: string): Promise<TodoCategory> =>
    http.post<TodoCategory>('/api/todo-categories', { name }).then((r) => r.data),

  remove: (id: number): Promise<void> =>
    http.delete(`/api/todo-categories/${id}`).then(() => undefined),
};
```

- [ ] **Step 2: Update Todo interface and create() in todo.ts**

Replace the full content of `frontend/src/api/todo.ts`:
```typescript
import { http } from './http';
import type { TodoCategory } from './todoCategory';

export interface TodoImage {
  id: number;
  image_path: string;
  sort_order: number;
}

export interface Todo {
  id: number;
  content: string;
  is_done: boolean;
  images: TodoImage[];
  created_at: string;
  done_at: string | null;
  category: TodoCategory | null;
}

export const todoApi = {
  getAll: () => http.get<Todo[]>('/api/todos').then((r) => r.data),

  create: (content: string, files: File[], categoryId?: number) => {
    const fd = new FormData();
    fd.append('content', content);
    if (categoryId !== undefined) fd.append('category_id', String(categoryId));
    files.forEach((f) => fd.append('images', f));
    return http.post<Todo>('/api/todos', fd).then((r) => r.data);
  },

  update: (id: number, data: { content?: string; is_done?: boolean }) =>
    http.patch<Todo>(`/api/todos/${id}`, data).then((r) => r.data),

  remove: (id: number) => http.delete(`/api/todos/${id}`),

  addImages: (id: number, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    return http.post<Todo>(`/api/todos/${id}/images`, fd).then((r) => r.data);
  },

  removeImage: (todoId: number, imageId: number) =>
    http.delete(`/api/todos/${todoId}/images/${imageId}`),
};
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/api/todoCategory.ts src/api/todo.ts
git commit -m "feat: add todoCategory API client, add category field to Todo"
```

---

## Task 5: Frontend — TodoPage category state + create-form tag bar

**Files:**
- Modify: `frontend/src/pages/TodoPage.tsx`

- [ ] **Step 1: Add imports and color helper at the top of TodoPage.tsx**

After the existing imports, add:
```typescript
import { todoCategoryApi } from '../api/todoCategory';
import type { TodoCategory } from '../api/todoCategory';
```

At file scope (outside the `TodoPage` component, before it), add:
```typescript
const CATEGORY_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-600 dark:text-orange-400' },
  { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  { bg: 'bg-pink-50 dark:bg-pink-950', text: 'text-pink-600 dark:text-pink-400' },
  { bg: 'bg-yellow-50 dark:bg-yellow-950', text: 'text-yellow-600 dark:text-yellow-400' },
] as const;

function getCategoryColor(id: number) {
  return CATEGORY_COLORS[id % CATEGORY_COLORS.length];
}
```

- [ ] **Step 2: Add new state variables inside TodoPage**

After the existing `useState` declarations (after `const [savingEdit, setSavingEdit] = useState(false);`), add:
```typescript
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null | 'none'>(null);
```

- [ ] **Step 3: Update the data-fetch effect to also load categories**

Replace the existing `useEffect` that fetches todos:
```typescript
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, cats] = await Promise.all([todoApi.getAll(), todoCategoryApi.getAll()]);
        if (!cancelled) {
          setTodos(data);
          setCategories(cats);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, '加载待办失败，请刷新重试'));
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
```

- [ ] **Step 4: Update handleCreate to pass selectedCategoryId**

Replace the existing `handleCreate` function:
```typescript
  const handleCreate = async () => {
    if (!content.trim()) return;
    setError('');
    setCreating(true);
    try {
      const todo = await todoApi.create(content, pendingFiles, selectedCategoryId ?? undefined);
      setTodos((prev) => [todo, ...prev]);
      setContent('');
      setPendingFiles([]);
      setSelectedCategoryId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(getErrorMessage(err, '创建待办失败，请重试'));
    } finally {
      setCreating(false);
    }
  };
```

- [ ] **Step 5: Add category management handlers**

After `handleCreate`, add two new functions:
```typescript
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const cat = await todoCategoryApi.create(newCategoryName.trim());
      setCategories((prev) => [...prev, cat]);
      setNewCategoryName('');
    } catch (err) {
      setError(getErrorMessage(err, '创建分类失败'));
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await todoCategoryApi.remove(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      if (filterCategoryId === id) setFilterCategoryId(null);
    } catch (err) {
      setError(getErrorMessage(err, '删除分类失败'));
    }
  };
```

- [ ] **Step 6: Add filtered todos computation**

Replace the two lines:
```typescript
  const pending = todos.filter((t) => !t.is_done);
  const done = todos.filter((t) => t.is_done);
```

With:
```typescript
  const filteredTodos =
    filterCategoryId === null
      ? todos
      : filterCategoryId === 'none'
        ? todos.filter((t) => t.category === null)
        : todos.filter((t) => t.category?.id === filterCategoryId);

  const pending = filteredTodos.filter((t) => !t.is_done);
  const done = filteredTodos.filter((t) => t.is_done);
```

- [ ] **Step 7: Add the category tag bar inside the Card**

In the JSX, inside `<CardContent className="pt-4 space-y-3">`, after the `{pendingFiles.length > 0 && ...}` block, add the category section:

```tsx
            {/* Category tag bar */}
            {!managingCategories ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground flex-shrink-0">分类：</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={`text-xs rounded-full px-3 py-0.5 border transition-colors ${
                    selectedCategoryId === null
                      ? 'border-primary text-primary bg-primary/10 font-medium'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  无
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)
                    }
                    className={`text-xs rounded-full px-3 py-0.5 border transition-colors ${
                      selectedCategoryId === cat.id
                        ? 'border-primary text-primary bg-primary/10 font-medium'
                        : 'border-border text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setManagingCategories(true)}
                  className="text-xs rounded-full px-3 py-0.5 border border-dashed border-border text-muted-foreground hover:border-foreground/30 transition-colors"
                  aria-label="管理分类"
                >
                  ＋
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-0.5 bg-muted text-foreground border border-border"
                    >
                      {cat.name}
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center text-[9px] leading-none transition-colors"
                        aria-label={`删除分类 ${cat.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {categories.length === 0 && (
                    <span className="text-xs text-muted-foreground">暂无分类</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && !creatingCategory && handleCreateCategory()
                    }
                    placeholder="新分类名称..."
                    className="flex-1 h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={creatingCategory || !newCategoryName.trim()}
                    className="h-7 text-xs"
                  >
                    添加
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setManagingCategories(false);
                      setNewCategoryName('');
                    }}
                    className="h-7 text-xs"
                  >
                    关闭
                  </Button>
                </div>
              </div>
            )}
```

- [ ] **Step 8: Commit**

```bash
cd frontend
git add src/pages/TodoPage.tsx
git commit -m "feat: add category state, fetch, create-form tag bar and management panel to TodoPage"
```

---

## Task 6: Frontend — Filter bar + category badges on list items

**Files:**
- Modify: `frontend/src/pages/TodoPage.tsx`

- [ ] **Step 1: Add the filter bar between the create card and the list**

The current JSX structure in `TodoPage` has:
```tsx
<div className="flex-shrink-0 space-y-6">
  {/* title, error, Card */}
</div>

<div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-4">
  {/* todos list */}
</div>
```

Add the filter bar as a new `<div>` inside the `flex-shrink-0` wrapper, after the `<Card>` closing tag:

```tsx
            {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="text-xs text-muted-foreground flex-shrink-0">筛选：</span>
                {(
                  [
                    { label: '全部', value: null as number | null | 'none' },
                    { label: '无分类', value: 'none' as 'none' },
                    ...categories.map((c) => ({ label: c.name, value: c.id })),
                  ] as const
                ).map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFilterCategoryId(value as number | null | 'none')}
                    className={`text-xs rounded-full px-3 py-0.5 border whitespace-nowrap flex-shrink-0 transition-colors ${
                      filterCategoryId === value
                        ? 'bg-foreground text-background border-foreground font-medium'
                        : 'border-border text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
```

- [ ] **Step 2: Add empty-state message when filter yields no results**

In the scrollable list `<div>`, update the empty-state check at the bottom of the `<>` fragment:

Replace:
```tsx
            {pending.length === 0 && done.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">暂无待办</p>
            )}
```

With:
```tsx
            {pending.length === 0 && done.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {filterCategoryId !== null ? '该分类下暂无待办' : '暂无待办'}
              </p>
            )}
```

- [ ] **Step 3: Add category badge to TodoList items**

In the `TodoList` function (at the bottom of the file), inside the `{items.map((todo) => { ... })}` block, find the content/edit section:

```tsx
                  {isEditing ? (
                    <Input ... />
                  ) : (
                    <span
                      className={`flex-1 text-sm ${todo.is_done ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {todo.content}
                    </span>
                  )}
                  {isEditing ? (
                    // save/cancel buttons
```

Between the content `<span>` and the action buttons, add:

```tsx
                  {!isEditing && todo.category && (() => {
                    const color = getCategoryColor(todo.category.id);
                    return (
                      <span
                        className={`text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap flex-shrink-0 ${color.bg} ${color.text}`}
                      >
                        {todo.category.name}
                      </span>
                    );
                  })()}
```

The full updated `<div className="flex items-start gap-3">` block inside the card (replace the existing one):

```tsx
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {busy ? (
                      <Spinner className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Checkbox
                        checked={todo.is_done}
                        onCheckedChange={() => onToggle(todo)}
                        disabled={isEditing}
                        aria-label={`标记 ${todo.content} 为${todo.is_done ? '未完成' : '已完成'}`}
                      />
                    )}
                  </div>
                  {isEditing ? (
                    <Input
                      value={draft}
                      onChange={(e) => onDraftChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !savingEdit) onSaveEdit();
                        if (e.key === 'Escape') onCancelEdit();
                      }}
                      autoFocus
                      className="flex-1"
                    />
                  ) : (
                    <span
                      className={`flex-1 text-sm ${todo.is_done ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {todo.content}
                    </span>
                  )}
                  {!isEditing && todo.category &&
                    (() => {
                      const color = getCategoryColor(todo.category.id);
                      return (
                        <span
                          className={`text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap flex-shrink-0 ${color.bg} ${color.text}`}
                        >
                          {todo.category.name}
                        </span>
                      );
                    })()}
                  {isEditing ? (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onSaveEdit}
                        disabled={savingEdit || !draft.trim()}
                      >
                        {savingEdit ? <Spinner className="h-4 w-4" /> : '保存'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancelEdit}
                        disabled={savingEdit}
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStartEdit(todo)}
                        disabled={busy || editingId !== null}
                        aria-label="编辑待办"
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(todo.id)}
                        disabled={busy || editingId !== null}
                        aria-label="删除待办"
                      >
                        {busy ? <Spinner className="h-4 w-4" /> : '删除'}
                      </Button>
                    </>
                  )}
                </div>
```

- [ ] **Step 4: Run lint and check for TypeScript errors**

```bash
cd frontend
yarn lint
```

Expected: `Done` with no errors.

- [ ] **Step 5: Start the dev server and visually test**

```bash
npm run dev
```

Open http://localhost:5173/app/todo and verify:

1. **Create-form tag bar** — shows `[无]` + `[＋]` when no categories exist
2. **Add a category** — click `＋` → management panel opens → type "工作" → Enter → "工作" appears as chip with `×`
3. **Close management panel** — click "关闭" → returns to tag bar with `[无] [工作] [＋]`
4. **Select category** — click "工作" → chip highlights blue
5. **Create todo** — type content and click "添加" → new todo appears with `工作` badge
6. **Create todo without category** — ensure "无" is active → create → no badge on new item
7. **Filter bar** — appears after adding a category: `[全部] [无分类] [工作]`
8. **Filter by category** — click "工作" → only todos with that category show
9. **Filter "无分类"** — click "无分类" → only uncategorised todos show
10. **Delete category** — click `＋` → management panel → click `×` on "工作" → category removed, filter resets to "全部", badges disappear from those todos

- [ ] **Step 6: Final commit**

```bash
cd frontend
git add src/pages/TodoPage.tsx
git commit -m "feat: add filter bar and category badges to TodoPage"
```

---

## Self-Review

**Spec coverage:**
- ✅ New `todo_category` table (flat, no hierarchy) — Task 1
- ✅ `category_id` nullable FK on `todo` with ON DELETE SET NULL — Task 2
- ✅ GET/POST/DELETE `/api/todo-categories` — Task 1
- ✅ CreateTodoDto accepts optional `category_id` — Task 2
- ✅ `findAll` returns `category` join — Task 3
- ✅ Frontend `todoCategory.ts` API client — Task 4
- ✅ `Todo` interface has `category: TodoCategory | null` — Task 4
- ✅ Create-form tag bar (option B) — Task 5
- ✅ `[＋]` opens management panel; `×` deletes — Task 5
- ✅ Default no category selected — Task 5 (`selectedCategoryId = null`)
- ✅ Filter bar with 全部 / 无分类 / categories — Task 6
- ✅ Front-end filtering only — Task 6 (`filteredTodos` computed from state)
- ✅ Category badge on list items — Task 6
- ✅ No badge when `category === null` — Task 6
- ✅ Color palette cycled by category id — Tasks 5+6 (`getCategoryColor`)

**No placeholders found.**

**Type consistency:** `TodoCategory` is defined once in `todoCategory.ts` and imported everywhere. `selectedCategoryId: number | null`, `filterCategoryId: number | null | 'none'` — types are consistent across state declaration, handlers, and filtering logic.
