import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";

@Entity("failed_file_deletions")
export class FailedFileDeletion {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "text" })
    bucket_name: string;

    @Column({ type: "text" })
    path: string;

    @Column({ type: "text", nullable: true })
    error_message: string | null;

    @Column({ type: "int", default: 0 })
    retry_count: number;

    @CreateDateColumn({ type: "timestamp with time zone" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamp with time zone" })
    updated_at: Date;
}
